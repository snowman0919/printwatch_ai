import { requireDevice } from "@/lib/device-auth";
import { iceServers } from "@/lib/turn";

export async function GET(request: Request) {
  try { const printerId = new URL(request.url).searchParams.get("printerId") ?? ""; requireDevice(request, printerId); return Response.json({ iceServers: await iceServers() }, { headers: { "cache-control": "no-store" } }); }
  catch (error) { return error instanceof Response ? error : Response.json({ error: "TURN unavailable" }, { status: 502 }); }
}
