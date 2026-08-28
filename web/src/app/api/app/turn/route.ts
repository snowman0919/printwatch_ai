import { requireSchoolUser } from "@/lib/auth";
import { iceServers } from "@/lib/turn";

export async function GET() {
  try { await requireSchoolUser(); return Response.json({ iceServers: await iceServers() }, { headers: { "cache-control": "private, no-store" } }); }
  catch (error) { return error instanceof Response ? error : Response.json({ error: "TURN unavailable" }, { status: 502 }); }
}
