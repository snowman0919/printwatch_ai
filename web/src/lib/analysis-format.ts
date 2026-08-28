import { z } from "zod";

const resultSchema = z.object({
  verdict: z.enum(["normal", "suspected", "failed", "unknown"]),
  failure_type: z.enum(["none", "spaghetti", "detached", "filament", "stopped", "camera", "unknown"]),
  failure_probability: z.number().min(0).max(1),
  progress_percent: z.number().min(0).max(100).nullable(),
  completed: z.boolean(),
  summary: z.string().min(1).max(240),
});

export function parseAnalysisContent(content: string) {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Vision response did not contain JSON");
  const value = JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
  if (value.verdict === "ongoing") value.verdict = "normal";
  if (value.failure_type === null) value.failure_type = "none";
  return resultSchema.parse(value);
}
