import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { requireDevice } from "@/lib/device-auth";
import { analyzePrint } from "@/lib/analysis";
import { latestSnapshotPaths, pruneSnapshotPaths, recordSnapshot, saveAnalysis } from "@/lib/db";

export const runtime = "nodejs";

const telemetrySchema = z.object({
  printerState: z.enum(["unknown", "idle", "printing", "complete"]),
  progressPercent: z.number().min(0).max(100).nullable(),
  elapsedSeconds: z.number().min(0).nullable(),
  hotendCelsius: z.number().min(-20).max(400).nullable(),
  bedCelsius: z.number().min(-20).max(150).nullable(),
  serialConnected: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const printerId = z.enum(["printer-1", "printer-2", "printer-3"]).parse(form.get("printerId"));
    requireDevice(request, printerId);
    const image = form.get("image");
    if (!(image instanceof File) || image.type !== "image/jpeg" || image.size < 100 || image.size > 8_000_000) return Response.json({ error: "A JPEG image between 100 bytes and 8 MB is required" }, { status: 400 });
    const telemetry = telemetrySchema.parse(JSON.parse(String(form.get("telemetry") ?? "{}")));
    const capturedAt = z.string().datetime().parse(form.get("capturedAt"));
    const dir = path.join(process.env.DATA_DIR ?? path.join(process.cwd(), ".data"), "snapshots", printerId);
    await mkdir(dir, { recursive: true });
    const target = path.join(dir, `${Date.now()}-${randomUUID()}.jpg`);
    const normalized = await sharp(Buffer.from(await image.arrayBuffer())).rotate().resize({ width: 1280, height: 720, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    await writeFile(target, normalized, { flag: "wx" });
    recordSnapshot({ printerId, capturedAt, path: target, telemetry });
    await Promise.all(pruneSnapshotPaths(printerId).map((file) => unlink(file).catch(() => undefined)));
    let analysis = null;
    let analysisError = false;
    if (form.get("requestAnalysis") === "true") {
      try {
        const paths = latestSnapshotPaths(printerId);
        analysis = await analyzePrint({ currentPath: paths[0], previousPath: paths[1], telemetry });
        saveAnalysis(printerId, analysis);
      } catch (error) {
        analysisError = true;
        console.error("vision analysis failed", error);
      }
    }
    return Response.json({ ok: true, analysis, analysisError });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) return Response.json({ error: z.prettifyError(error) }, { status: 400 });
    console.error("snapshot upload failed", error);
    return Response.json({ error: "Snapshot processing failed" }, { status: 500 });
  }
}
