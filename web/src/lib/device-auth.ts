import "server-only";
import { timingSafeEqual } from "node:crypto";

function equalSecret(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function requireDevice(request: Request, printerId: string): void {
  const configured = JSON.parse(process.env.DEVICE_TOKENS_JSON ?? "{}") as Record<string, string>;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!configured[printerId] || !equalSecret(token, configured[printerId])) throw new Response("Unauthorized device", { status: 401 });
}
