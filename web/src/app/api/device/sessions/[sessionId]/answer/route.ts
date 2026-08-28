import { z } from "zod";
import { requireDevice } from "@/lib/device-auth";
import { answerSession } from "@/lib/db";

const schema = z.object({ printerId: z.string().regex(/^printer-[1-3]$/), answer: z.object({ type: z.literal("answer"), sdp: z.string().min(20).max(1_000_000) }) });

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try { const body = schema.parse(await request.json()); requireDevice(request, body.printerId); answerSession((await context.params).sessionId, body.printerId, JSON.stringify(body.answer)); return Response.json({ ok: true }); }
  catch (error) { if (error instanceof Response) return error; if (error instanceof z.ZodError) return Response.json({ error: "Invalid SDP answer" }, { status: 400 }); return Response.json({ error: "Unable to save answer" }, { status: 404 }); }
}
