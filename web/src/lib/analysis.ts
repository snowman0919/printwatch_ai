import "server-only";
import { readFile } from "node:fs/promises";
import type { Analysis, Telemetry } from "./types";
import { parseAnalysisContent } from "./analysis-format";

export async function analyzePrint(input: { currentPath: string; previousPath?: string; telemetry: Telemetry }): Promise<Analysis> {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://100.90.167.128:11434/v1").replace(/\/$/, "");
  const images = await Promise.all([input.currentPath, input.previousPath].filter(Boolean).map(async (file) => `data:image/jpeg;base64,${(await readFile(file!)).toString("base64")}`));
  const prompt = [
    "You monitor a stock Ender-3 V3 SE. Compare the current image with the previous image when present.",
    "Decide only from visible evidence and the read-only printer telemetry. Be conservative.",
    "failed means clear spaghetti, detached print, filament failure, stopped print, or another unrecoverable visible defect.",
    "completed may be true when telemetry reports complete or the finished object is visibly stationary with the hotend away.",
    "Return one JSON object only with keys verdict, failure_type, failure_probability, progress_percent, completed, summary.",
    "verdict must be exactly normal, suspected, failed, or unknown. Use normal while a healthy print is ongoing.",
    "failure_type must be exactly none, spaghetti, detached, filament, stopped, camera, or unknown; never null.",
    "summary must be concise Korean. No Markdown.",
    `telemetry=${JSON.stringify(input.telemetry)}`,
  ].join("\n");
  const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }, ...images.map((url) => ({ type: "image_url", image_url: { url } }))];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OLLAMA_API_KEY ?? "ollama"}` }, body: JSON.stringify({ model: process.env.OLLAMA_MODEL ?? "Qwythos-v2-9B:Q4", messages: [{ role: "user", content }], response_format: { type: "json_object" }, think: false, temperature: 0.1, seed: 3, max_tokens: 1000 }), signal: controller.signal });
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
    const body = await response.json() as { choices?: Array<{message?:{content?:string}}> };
    const parsed = parseAnalysisContent(body.choices?.[0]?.message?.content ?? "");
    return { verdict: parsed.verdict, failureType: parsed.failure_type, failureProbability: parsed.failure_probability, progressPercent: parsed.progress_percent, completed: parsed.completed, summary: parsed.summary, observedAt: new Date().toISOString() };
  } finally { clearTimeout(timeout); }
}
