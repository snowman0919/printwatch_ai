import {analysisSchema, buildAnalysisPrompt} from "./aiPrompt";

export type AiResult = {
  status: "normal" | "suspected" | "failed" | "unknown";
  failureTypes: string[];
  failureProbability: number;
  visualProgressPercent: number | null;
  progressConfidence: number;
  isPrintStopped: boolean;
  isFilamentTangled: boolean;
  isSpaghetti: boolean;
  summary: string;
  recommendedAction: string;
  notifyLevel: "none" | "suspect" | "critical";
};

type AnalyzeInput = {
  printerId: string;
  currentImageUrl: string;
  previousImageUrl: string | null;
  currentTimeProgress: number | null;
  ocrProgress: number | null;
  localSignals: Record<string, unknown>;
  previousStatus: string | null;
};

export async function analyzeWithOpenAi(input: AnalyzeInput): Promise<AiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      status: "unknown",
      failureTypes: ["unknown"],
      failureProbability: 0,
      visualProgressPercent: null,
      progressConfidence: 0,
      isPrintStopped: false,
      isFilamentTangled: false,
      isSpaghetti: false,
      summary: "OPENAI_API_KEY is not configured. AI analysis was skipped.",
      recommendedAction: "Firebase Functions 환경 변수에 OPENAI_API_KEY를 설정하세요.",
      notifyLevel: "none",
    };
  }

  const content: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: buildAnalysisPrompt({
        printerId: input.printerId,
        currentTimeProgress: input.currentTimeProgress,
        ocrProgress: input.ocrProgress,
        localSignals: input.localSignals,
        previousStatus: input.previousStatus,
      }),
    },
    {type: "input_image", image_url: input.currentImageUrl},
  ];
  if (input.previousImageUrl) {
    content.push({type: "input_image", image_url: input.previousImageUrl});
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5-nano",
      input: [{role: "user", content}],
      text: {
        format: {
          type: "json_schema",
          name: "printwatch_analysis",
          strict: true,
          schema: analysisSchema,
        },
      },
      max_output_tokens: 800,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${body}`);
  }
  const json = await response.json() as Record<string, unknown>;
  const text = extractOutputText(json);
  return normalize(JSON.parse(text) as Record<string, unknown>);
}

function extractOutputText(response: Record<string, unknown>): string {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }
  const output = response.output as Array<Record<string, unknown>> | undefined;
  for (const item of output ?? []) {
    const content = item.content as Array<Record<string, unknown>> | undefined;
    for (const part of content ?? []) {
      if (typeof part.text === "string") {
        return part.text;
      }
    }
  }
  throw new Error("OpenAI response did not contain output text");
}

function normalize(data: Record<string, unknown>): AiResult {
  return {
    status: asStatus(data.status),
    failureTypes: Array.isArray(data.failure_types)
      ? data.failure_types.map(String)
      : ["unknown"],
    failureProbability: clamp(Number(data.failure_probability), 0, 1),
    visualProgressPercent: data.visual_progress_percent === null ? null : clamp(Number(data.visual_progress_percent), 0, 100),
    progressConfidence: clamp(Number(data.progress_confidence), 0, 1),
    isPrintStopped: Boolean(data.is_print_stopped),
    isFilamentTangled: Boolean(data.is_filament_tangled),
    isSpaghetti: Boolean(data.is_spaghetti),
    summary: String(data.summary ?? ""),
    recommendedAction: String(data.recommended_action ?? ""),
    notifyLevel: asNotify(data.notify_level),
  };
}

function asStatus(value: unknown): AiResult["status"] {
  return value === "normal" || value === "suspected" || value === "failed" || value === "unknown" ? value : "unknown";
}

function asNotify(value: unknown): AiResult["notifyLevel"] {
  return value === "none" || value === "suspect" || value === "critical" ? value : "none";
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
