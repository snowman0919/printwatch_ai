import { requireDevice } from "@/lib/device-auth";
import { pendingSessions } from "@/lib/db";

export async function GET(request: Request) {
  try { const printerId = new URL(request.url).searchParams.get("printerId") ?? ""; requireDevice(request, printerId); return Response.json({ sessions: pendingSessions(printerId).map((entry) => ({ id: entry.id, offer: JSON.parse(entry.offer) })) }, { headers: { "cache-control": "no-store" } }); }
  catch (error) { return error instanceof Response ? error : Response.json({ error: "Unable to read sessions" }, { status: 500 }); }
}
