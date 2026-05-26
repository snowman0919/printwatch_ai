export type AiPromptInput = {
  printerId: string;
  currentTimeProgress: number | null;
  ocrProgress: number | null;
  localSignals: Record<string, unknown>;
  previousStatus: string | null;
};

export function buildAnalysisPrompt(input: AiPromptInput): string {
  return [
    "You are PrintWatch AI monitoring a stock Ender-3 V3 SE printer.",
    "Analyze only visible print failure evidence from the images and metadata.",
    "Be conservative: normal if evidence is weak, suspected for possible failures, failed only when highly likely.",
    "Do not suggest printer control actions. Recommended actions must be view-only human inspection guidance.",
    "Return strict JSON only with exactly these keys:",
    "status, failure_types, failure_probability, visual_progress_percent, progress_confidence, is_print_stopped, is_filament_tangled, is_spaghetti, summary, recommended_action, notify_level.",
    "Allowed status values: normal, suspected, failed, unknown.",
    "Allowed failure_types values: spaghetti, filament_tangled, print_stopped, camera_blocked, unknown.",
    "Allowed notify_level values: none, suspect, critical.",
    `printer_id: ${input.printerId}`,
    `current_time_progress_percent: ${input.currentTimeProgress ?? "unknown"}`,
    `ocr_progress_percent: ${input.ocrProgress ?? "unknown"}`,
    `previous_ai_status: ${input.previousStatus ?? "unknown"}`,
    `local_signals_json: ${JSON.stringify(input.localSignals)}`,
  ].join("\n");
}

export const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "failure_types",
    "failure_probability",
    "visual_progress_percent",
    "progress_confidence",
    "is_print_stopped",
    "is_filament_tangled",
    "is_spaghetti",
    "summary",
    "recommended_action",
    "notify_level",
  ],
  properties: {
    status: {type: "string", enum: ["normal", "suspected", "failed", "unknown"]},
    failure_types: {
      type: "array",
      items: {type: "string", enum: ["spaghetti", "filament_tangled", "print_stopped", "camera_blocked", "unknown"]},
    },
    failure_probability: {type: "number", minimum: 0, maximum: 1},
    visual_progress_percent: {type: ["number", "null"], minimum: 0, maximum: 100},
    progress_confidence: {type: "number", minimum: 0, maximum: 1},
    is_print_stopped: {type: "boolean"},
    is_filament_tangled: {type: "boolean"},
    is_spaghetti: {type: "boolean"},
    summary: {type: "string"},
    recommended_action: {type: "string"},
    notify_level: {type: "string", enum: ["none", "suspect", "critical"]},
  },
} as const;
