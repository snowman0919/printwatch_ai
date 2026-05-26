import {createHmac, timingSafeEqual} from "node:crypto";
import * as admin from "firebase-admin";
import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";

import {analyzeWithOpenAi, AiResult} from "./openai";

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();
const fieldValue = admin.firestore.FieldValue;
const printerIds = ["Printer-1", "Printer-2", "Printer-3", "Printer-4", "Printer-5"];
const openAiApiKey = defineSecret("OPENAI_API_KEY");
const piDeviceSecrets = defineSecret("PI_DEVICE_SECRETS_JSON");

type SnapshotData = {
  printerId: string;
  jobId?: string | null;
  aiImagePath?: string;
  aiImageUrl?: string;
  originalPath?: string;
  thumbnailPath?: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  localSignals?: Record<string, unknown>;
  ocr?: {
    progressPercent?: number | null;
    confidence?: number;
  };
};

export const validateDimigoUser = onCall(async (request) => {
  const auth = request.auth;
  if (!auth?.token.email || !auth.token.email.endsWith("@dimigo.hs.kr")) {
    throw new HttpsError("permission-denied", "Only @dimigo.hs.kr accounts are allowed.");
  }
  await db.collection("users").doc(auth.uid).set({
    email: auth.token.email,
    displayName: auth.token.name ?? "",
    role: "member",
    allowedPrinters: printerIds,
    createdAt: fieldValue.serverTimestamp(),
    lastSeenAt: fieldValue.serverTimestamp(),
  }, {merge: true});
  return {ok: true};
});

export const uploadSnapshot = onRequest({cors: false, maxInstances: 10, secrets: [piDeviceSecrets]}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }
  if (!verifyDeviceRequest(req)) {
    res.status(401).send("Unauthorized device");
    return;
  }

  const body = req.body as Record<string, unknown>;
  const printerId = String(body.printerId ?? "");
  if (!printerIds.includes(printerId)) {
    res.status(400).send("Invalid printerId");
    return;
  }

  const capturedAt = body.capturedAt ? new Date(String(body.capturedAt)) : new Date();
  const snapshotRef = db.collection("snapshots").doc();
  const basePath = `printers/${printerId}/snapshots/${snapshotRef.id}`;
  const originalPath = `${basePath}/original.jpg`;
  const thumbnailPath = `${basePath}/thumbnail.jpg`;
  const aiImagePath = `${basePath}/ai.jpg`;

  await Promise.all([
    saveBase64Image(originalPath, String(body.originalImageBase64 ?? "")),
    saveBase64Image(thumbnailPath, String(body.thumbnailImageBase64 ?? "")),
    saveBase64Image(aiImagePath, String(body.aiImageBase64 ?? "")),
  ]);

  const [originalUrl, thumbnailUrl, aiImageUrl] = await Promise.all([
    signedReadUrl(originalPath),
    signedReadUrl(thumbnailPath),
    signedReadUrl(aiImagePath),
  ]);

  await snapshotRef.set({
    printerId,
    jobId: body.jobId ?? null,
    capturedAt: admin.firestore.Timestamp.fromDate(capturedAt),
    originalPath,
    thumbnailPath,
    aiImagePath,
    originalUrl,
    thumbnailUrl,
    aiImageUrl,
    localSignals: body.localSignals ?? {},
    ocr: body.ocr ?? {
      rawText: "",
      progressPercent: null,
      elapsedText: null,
      remainingText: null,
      confidence: 0,
    },
    aiAnalysisId: null,
    createdAt: fieldValue.serverTimestamp(),
  });

  res.status(201).json({snapshotId: snapshotRef.id});
});

export const onSnapshotUploaded = onDocumentCreated({document: "snapshots/{snapshotId}", secrets: [openAiApiKey]}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }
  const data = snapshot.data() as SnapshotData;
  const printerRef = db.collection("printers").doc(data.printerId);
  await printerRef.set({
    name: data.printerId,
    status: "unknown",
    latestSnapshotId: snapshot.id,
    latestThumbnailUrl: data.thumbnailUrl ?? null,
    latestOriginalUrl: data.originalUrl ?? null,
    lastSeenAt: fieldValue.serverTimestamp(),
    streamAvailable: true,
    createdAt: fieldValue.serverTimestamp(),
  }, {merge: true});

  if (data.jobId && typeof data.ocr?.progressPercent === "number" && (data.ocr.confidence ?? 0) >= 0.45) {
    await updateJobProgress(data.jobId, data.ocr.progressPercent);
  }

  if (isSuspicious(data.localSignals ?? {})) {
    await runAiAnalysisForSnapshotInternal(snapshot.id);
  }
});

export const scheduledAiAnalysis = onSchedule({schedule: "every 30 minutes", secrets: [openAiApiKey]}, async () => {
  const printers = await db.collection("printers").get();
  for (const printer of printers.docs) {
    const lastSeenAt = printer.get("lastSeenAt") as admin.firestore.Timestamp | undefined;
    if (!lastSeenAt || Date.now() - lastSeenAt.toMillis() > 10 * 60 * 1000) {
      continue;
    }
    const latest = await db.collection("snapshots")
      .where("printerId", "==", printer.id)
      .orderBy("capturedAt", "desc")
      .limit(1)
      .get();
    if (!latest.empty) {
      await runAiAnalysisForSnapshotInternal(latest.docs[0].id);
    }
  }
});

export const runAiAnalysisForSnapshot = onCall({secrets: [openAiApiKey]}, async (request) => {
  if (!request.auth?.token.email?.endsWith("@dimigo.hs.kr")) {
    throw new HttpsError("permission-denied", "Only @dimigo.hs.kr users can request analysis.");
  }
  const snapshotId = String(request.data?.snapshotId ?? "");
  if (!snapshotId) {
    throw new HttpsError("invalid-argument", "snapshotId is required.");
  }
  const analysisId = await runAiAnalysisForSnapshotInternal(snapshotId);
  return {analysisId};
});

export const sendAlertNotification = onDocumentCreated("alerts/{alertId}", async (event) => {
  const alert = event.data;
  if (!alert) {
    return;
  }
  const data = alert.data();
  const printerId = String(data.printerId ?? "");
  const level = String(data.level ?? "info");
  const tokens = await loadTokensForPrinter(printerId);
  if (tokens.length === 0) {
    return;
  }
  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: String(data.title ?? "PrintWatch AI"),
      body: String(data.body ?? ""),
    },
    data: {
      printerId,
      alertId: alert.id,
      level,
    },
  });
});

export const cleanupOldImages = onSchedule("every 24 hours", async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oldSnapshots = await db.collection("snapshots")
    .where("capturedAt", "<", cutoff)
    .limit(200)
    .get();
  for (const snap of oldSnapshots.docs) {
    const data = snap.data() as SnapshotData;
    await Promise.all([
      deleteIfExists(data.originalPath),
      deleteIfExists(data.thumbnailPath),
      deleteIfExists(data.aiImagePath),
    ]);
    await snap.ref.delete();
  }
});

export const updatePrinterOfflineStatus = onSchedule("every 5 minutes", async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
  const printers = await db.collection("printers").get();
  const batch = db.batch();
  for (const printer of printers.docs) {
    const lastSeenAt = printer.get("lastSeenAt") as admin.firestore.Timestamp | undefined;
    if (!lastSeenAt || lastSeenAt.toMillis() < cutoff.toMillis()) {
      batch.set(printer.ref, {status: "offline"}, {merge: true});
    }
  }
  await batch.commit();
});

async function runAiAnalysisForSnapshotInternal(snapshotId: string): Promise<string> {
  const snapshotDoc = await db.collection("snapshots").doc(snapshotId).get();
  if (!snapshotDoc.exists) {
    throw new Error(`Snapshot ${snapshotId} does not exist`);
  }
  const snapshot = snapshotDoc.data() as SnapshotData;
  const previousSnapshot = await findPreviousSnapshot(snapshot.printerId, snapshotId);
  const previousAnalysis = await findPreviousAnalysis(snapshot.printerId);
  const result = await analyzeWithOpenAi({
    printerId: snapshot.printerId,
    currentImageUrl: snapshot.aiImageUrl ?? await signedReadUrl(snapshot.aiImagePath ?? ""),
    previousImageUrl: previousSnapshot?.get("aiImageUrl") ?? null,
    currentTimeProgress: await currentTimeProgress(snapshot.jobId ?? null),
    ocrProgress: typeof snapshot.ocr?.progressPercent === "number" ? snapshot.ocr.progressPercent : null,
    localSignals: snapshot.localSignals ?? {},
    previousStatus: previousAnalysis?.get("status") ?? null,
  });
  const finalResult = await maybeEscalateConsecutiveFailure(snapshot, result);
  const analysisRef = db.collection("aiAnalyses").doc();
  await analysisRef.set({
    printerId: snapshot.printerId,
    jobId: snapshot.jobId ?? null,
    snapshotId,
    previousSnapshotId: previousSnapshot?.id ?? null,
    status: finalResult.status,
    failureTypes: finalResult.failureTypes,
    failureProbability: finalResult.failureProbability,
    visualProgressPercent: finalResult.visualProgressPercent,
    progressConfidence: finalResult.progressConfidence,
    isPrintStopped: finalResult.isPrintStopped,
    isFilamentTangled: finalResult.isFilamentTangled,
    isSpaghetti: finalResult.isSpaghetti,
    summary: finalResult.summary,
    recommendedAction: finalResult.recommendedAction,
    notifyLevel: finalResult.notifyLevel,
    model: "gpt-5-nano",
    createdAt: fieldValue.serverTimestamp(),
  });
  await snapshotDoc.ref.update({aiAnalysisId: analysisRef.id});
  await db.collection("printers").doc(snapshot.printerId).set({
    status: finalResult.status,
    lastSeenAt: fieldValue.serverTimestamp(),
  }, {merge: true});
  if (snapshot.jobId && finalResult.visualProgressPercent !== null && finalResult.progressConfidence >= 0.5) {
    await updateJobProgress(snapshot.jobId, finalResult.visualProgressPercent);
  }
  if (finalResult.notifyLevel !== "none") {
    await createAlertIfAllowed(snapshot, analysisRef.id, finalResult);
  }
  return analysisRef.id;
}

async function maybeEscalateConsecutiveFailure(snapshot: SnapshotData, result: AiResult): Promise<AiResult> {
  if (result.status !== "suspected" || result.failureTypes.length === 0) {
    return result;
  }
  const previous = await db.collection("aiAnalyses")
    .where("printerId", "==", snapshot.printerId)
    .where("jobId", "==", snapshot.jobId ?? null)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  if (previous.empty || previous.docs[0].get("status") !== "suspected") {
    return result;
  }
  const previousTypes = new Set((previous.docs[0].get("failureTypes") as string[] | undefined) ?? []);
  if (result.failureTypes.some((type) => previousTypes.has(type))) {
    return {...result, status: "failed", notifyLevel: "critical", failureProbability: Math.max(result.failureProbability, 0.85)};
  }
  return result;
}

async function createAlertIfAllowed(snapshot: SnapshotData, analysisId: string, result: AiResult): Promise<void> {
  const failureKey = result.failureTypes.sort().join(",") || "unknown";
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 60 * 1000);
  const recent = await db.collection("alerts")
    .where("printerId", "==", snapshot.printerId)
    .where("failureKey", "==", failureKey)
    .where("createdAt", ">", cutoff)
    .limit(1)
    .get();
  if (!recent.empty) {
    return;
  }
  await db.collection("alerts").add({
    printerId: snapshot.printerId,
    jobId: snapshot.jobId ?? null,
    analysisId,
    level: result.notifyLevel === "critical" ? "critical" : "suspect",
    title: `${snapshot.printerId} ${result.status === "failed" ? "실패 가능성 높음" : "이상 징후 감지"}`,
    body: result.summary,
    failureKey,
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: fieldValue.serverTimestamp(),
  });
}

async function updateJobProgress(jobId: string, progressPercent: number): Promise<void> {
  const jobRef = db.collection("printJobs").doc(jobId);
  const job = await jobRef.get();
  const data = job.data() ?? {};
  const estimatedDurationMin = typeof data.estimatedDurationMin === "number" ? data.estimatedDurationMin : null;
  const remainingMin = estimatedDurationMin === null ? null : Math.max(0, estimatedDurationMin * (1 - progressPercent / 100));
  await jobRef.set({
    ocrProgressPercent: progressPercent,
    displayProgressPercent: progressPercent,
    remainingMin,
    estimatedFinishAt: remainingMin === null ? null : admin.firestore.Timestamp.fromMillis(Date.now() + remainingMin * 60 * 1000),
    updatedAt: fieldValue.serverTimestamp(),
  }, {merge: true});
}

async function currentTimeProgress(jobId: string | null): Promise<number | null> {
  if (!jobId) {
    return null;
  }
  const job = await db.collection("printJobs").doc(jobId).get();
  const startedAt = job.get("startedAt") as admin.firestore.Timestamp | undefined;
  const estimatedDurationMin = job.get("estimatedDurationMin") as number | undefined;
  if (!startedAt || !estimatedDurationMin) {
    return null;
  }
  const elapsedMin = (Date.now() - startedAt.toMillis()) / 60000;
  return Math.min(100, Math.max(0, elapsedMin / estimatedDurationMin * 100));
}

async function findPreviousSnapshot(printerId: string, snapshotId: string) {
  const latest = await db.collection("snapshots")
    .where("printerId", "==", printerId)
    .orderBy("capturedAt", "desc")
    .limit(3)
    .get();
  return latest.docs.find((doc) => doc.id !== snapshotId) ?? null;
}

async function findPreviousAnalysis(printerId: string) {
  const latest = await db.collection("aiAnalyses")
    .where("printerId", "==", printerId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  return latest.docs[0] ?? null;
}

function isSuspicious(signals: Record<string, unknown>): boolean {
  return Boolean(signals.cameraBlocked) ||
    Boolean(signals.possibleStopped) ||
    Boolean(signals.possibleSpaghetti);
}

async function loadTokensForPrinter(printerId: string): Promise<string[]> {
  const users = await db.collection("users").get();
  const allowedUserIds = users.docs
    .filter((user) => {
      const role = user.get("role");
      const allowed = user.get("allowedPrinters") as string[] | undefined;
      return role === "admin" || allowed?.includes(printerId);
    })
    .map((user) => user.id);
  if (allowedUserIds.length === 0) {
    return [];
  }
  const tokens = await db.collection("deviceTokens").get();
  return tokens.docs
    .filter((token) => allowedUserIds.includes(String(token.get("userId"))))
    .map((token) => String(token.get("token")))
    .filter(Boolean);
}

async function saveBase64Image(path: string, data: string): Promise<void> {
  if (!data) {
    throw new Error(`Missing image payload for ${path}`);
  }
  await bucket.file(path).save(Buffer.from(data, "base64"), {
    contentType: "image/jpeg",
    resumable: false,
    metadata: {cacheControl: "private, max-age=300"},
  });
}

async function signedReadUrl(path: string): Promise<string> {
  const [url] = await bucket.file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return url;
}

async function deleteIfExists(path?: string): Promise<void> {
  if (!path) {
    return;
  }
  try {
    await bucket.file(path).delete();
  } catch (error) {
    logger.debug(`Ignoring delete failure for ${path}`, error);
  }
}

function verifyDeviceRequest(req: {headers: Record<string, string | string[] | undefined>; rawBody?: Buffer}): boolean {
  const secrets = JSON.parse(process.env.PI_DEVICE_SECRETS_JSON ?? "{}") as Record<string, string>;
  const deviceId = String(req.headers["x-device-id"] ?? "");
  const timestamp = String(req.headers["x-timestamp"] ?? "");
  const signature = String(req.headers["x-signature"] ?? "");
  const secret = secrets[deviceId];
  const rawBody = req.rawBody;
  if (!secret || !timestamp || !signature || !rawBody) {
    return false;
  }
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");
  return safeEqual(signature, expected);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
