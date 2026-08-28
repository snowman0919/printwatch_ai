import assert from "node:assert/strict";
import test from "node:test";
import { derivePrinterStatus } from "./state.ts";
import type { Analysis, Telemetry } from "./types.ts";

const telemetry: Telemetry = { printerState: "printing", progressPercent: 42, elapsedSeconds: 1200, hotendCelsius: 205, bedCelsius: 60, serialConnected: true };
const suspected: Analysis = { verdict: "suspected", failureType: "spaghetti", failureProbability: 0.62, progressPercent: 42, completed: false, summary: "실 형태 돌출 의심", observedAt: "2026-08-28T00:00:00Z" };

test("stale devices are offline regardless of old AI data", () => assert.equal(derivePrinterStatus({ nowMs: 60_000, lastSeenAt: "1970-01-01T00:00:00Z", telemetry, analysis: suspected, previousAnalysis: suspected }), "offline"));
test("two consecutive matching suspicions escalate to failed", () => assert.equal(derivePrinterStatus({ nowMs: 10_000, lastSeenAt: "1970-01-01T00:00:09Z", telemetry, analysis: suspected, previousAnalysis: suspected }), "failed"));
test("read-only telemetry proves completion when vision is normal", () => assert.equal(derivePrinterStatus({ nowMs: 10_000, lastSeenAt: "1970-01-01T00:00:09Z", telemetry: { ...telemetry, printerState: "complete" }, analysis: { ...suspected, verdict: "normal", failureType: "none", failureProbability: 0 }, previousAnalysis: null }), "completed"));
