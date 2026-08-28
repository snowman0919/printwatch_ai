export type PrinterStatus = "offline" | "idle" | "printing" | "completed" | "suspected" | "failed";

export type Telemetry = {
  printerState: "unknown" | "idle" | "printing" | "complete";
  progressPercent: number | null;
  elapsedSeconds: number | null;
  hotendCelsius: number | null;
  bedCelsius: number | null;
  serialConnected: boolean;
};

export type Analysis = {
  verdict: "normal" | "suspected" | "failed" | "unknown";
  failureType: "none" | "spaghetti" | "detached" | "filament" | "stopped" | "camera" | "unknown";
  failureProbability: number;
  progressPercent: number | null;
  completed: boolean;
  summary: string;
  observedAt: string;
};

export type PrinterView = {
  id: string;
  name: string;
  status: PrinterStatus;
  lastSeenAt: string | null;
  snapshotUrl: string | null;
  telemetry: Telemetry;
  analysis: Analysis | null;
};
