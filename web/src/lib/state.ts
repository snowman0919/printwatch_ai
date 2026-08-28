import type { Analysis, PrinterStatus, Telemetry } from "./types";

export function derivePrinterStatus(input: {
  nowMs: number;
  lastSeenAt: string | null;
  telemetry: Telemetry;
  analysis: Analysis | null;
  previousAnalysis: Analysis | null;
}): PrinterStatus {
  const seen = input.lastSeenAt ? Date.parse(input.lastSeenAt) : Number.NaN;
  if (!Number.isFinite(seen) || input.nowMs - seen > 45_000) return "offline";
  const ai = input.analysis;
  const repeated = ai?.verdict === "suspected" && input.previousAnalysis?.verdict === "suspected" && ai.failureType === input.previousAnalysis.failureType;
  if (ai?.verdict === "failed" || (ai && ai.failureProbability >= 0.85) || repeated) return "failed";
  if (ai?.verdict === "suspected") return "suspected";
  if (input.telemetry.printerState === "complete" || ai?.completed) return "completed";
  if (input.telemetry.printerState === "printing") return "printing";
  return "idle";
}
