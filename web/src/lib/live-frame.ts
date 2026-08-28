import "server-only";
import path from "node:path";

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");

export function liveFramePath(printerId: string): string | null {
  return /^printer-[1-3]$/.test(printerId) ? path.join(dataDir, "live", `${printerId}.jpg`) : null;
}
