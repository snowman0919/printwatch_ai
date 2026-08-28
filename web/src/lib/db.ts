import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Analysis, PrinterView, Telemetry } from "./types";
import { derivePrinterStatus } from "./state";

let connection: DatabaseSync | null = null;

function database(): DatabaseSync {
  if (connection) return connection;
  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "printwatch.sqlite"));
  db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS printers (id TEXT PRIMARY KEY, name TEXT NOT NULL, last_seen_at TEXT, snapshot_path TEXT, telemetry_json TEXT NOT NULL DEFAULT '{}', analysis_json TEXT, previous_analysis_json TEXT);
CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, printer_id TEXT NOT NULL, captured_at TEXT NOT NULL, path TEXT NOT NULL, analysis_json TEXT, FOREIGN KEY(printer_id) REFERENCES printers(id));
CREATE INDEX IF NOT EXISTS snapshots_printer_time ON snapshots(printer_id, captured_at DESC);`);
  for (let index = 1; index <= 3; index++) db.prepare("INSERT OR IGNORE INTO printers (id, name) VALUES (?, ?)").run(`printer-${index}`, `Ender ${index}`);
  return connection = db;
}

const emptyTelemetry: Telemetry = { printerState: "unknown", progressPercent: null, elapsedSeconds: null, hotendCelsius: null, bedCelsius: null, serialConnected: false };
function parsed<T>(value: unknown, fallback: T): T { try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; } }

export function dashboardData(): PrinterView[] {
  return (database().prepare("SELECT * FROM printers ORDER BY id").all() as Record<string, unknown>[]).map((row) => {
    const telemetry = { ...emptyTelemetry, ...parsed<Partial<Telemetry>>(row.telemetry_json, {}) };
    const analysis = parsed<Analysis | null>(row.analysis_json, null);
    const previous = parsed<Analysis | null>(row.previous_analysis_json, null);
    return { id: String(row.id), name: String(row.name), lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null, snapshotUrl: row.snapshot_path ? `/api/media/${row.id}/latest` : null, telemetry, analysis, status: derivePrinterStatus({ nowMs: Date.now(), lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null, telemetry, analysis, previousAnalysis: previous }) };
  });
}

export function recordSnapshot(input: { printerId: string; capturedAt: string; path: string; telemetry: Telemetry }) {
  const db = database();
  db.prepare("INSERT INTO snapshots (printer_id, captured_at, path) VALUES (?, ?, ?)").run(input.printerId, input.capturedAt, input.path);
  db.prepare("UPDATE printers SET last_seen_at=?, snapshot_path=?, telemetry_json=? WHERE id=?").run(new Date().toISOString(), input.path, JSON.stringify(input.telemetry), input.printerId);
}

export function pruneSnapshotPaths(printerId: string, keep = 480): string[] {
  const db = database();
  const stale = db.prepare("SELECT id, path FROM snapshots WHERE printer_id=? ORDER BY captured_at DESC LIMIT -1 OFFSET ?").all(printerId, keep) as { id:number; path:string }[];
  if (stale.length) db.prepare(`DELETE FROM snapshots WHERE id IN (${stale.map(() => "?").join(",")})`).run(...stale.map((row) => row.id));
  return stale.map((row) => row.path);
}

export function latestSnapshotPaths(printerId: string): string[] { return (database().prepare("SELECT path FROM snapshots WHERE printer_id=? ORDER BY captured_at DESC LIMIT 2").all(printerId) as {path:string}[]).map((row) => row.path); }
export function saveAnalysis(printerId: string, analysis: Analysis) { const db = database(); db.prepare("UPDATE printers SET previous_analysis_json=analysis_json, analysis_json=? WHERE id=?").run(JSON.stringify(analysis), printerId); db.prepare("UPDATE snapshots SET analysis_json=? WHERE id=(SELECT id FROM snapshots WHERE printer_id=? ORDER BY captured_at DESC LIMIT 1)").run(JSON.stringify(analysis), printerId); }
export function latestMediaPath(printerId: string): string | null { return (database().prepare("SELECT snapshot_path AS path FROM printers WHERE id=?").get(printerId) as {path?:string} | undefined)?.path ?? null; }
