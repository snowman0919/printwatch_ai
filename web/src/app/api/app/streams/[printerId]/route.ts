import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireSchoolUser } from "@/lib/auth";
import { createSession, sessionAnswer } from "@/lib/db";

const offerSchema = z.object({ offer: z.object({ type: z.literal("offer"), sdp: z.string().min(20).max(1_000_000) }) });

export async function POST(request: Request, context: { params: Promise<{ printerId: string }> }) {
  try {
    const user = await requireSchoolUser();
    const { printerId } = await context.params;
    if (!/^printer-[1-3]$/.test(printerId)) return Response.json({ error: "Unknown printer" }, { status: 404 });
    const { offer } = offerSchema.parse(await request.json());
    const id = randomUUID();
    createSession({ id, printerId, viewerId: user.id, offer: JSON.stringify(offer) });
    return Response.json({ sessionId: id }, { status: 201 });
  } catch (error) { if (error instanceof Response) return error; if (error instanceof z.ZodError) return Response.json({ error: "Invalid SDP offer" }, { status: 400 }); return Response.json({ error: "Unable to create stream" }, { status: 500 }); }
}

export async function GET(request: Request) {
  try {
    const user = await requireSchoolUser();
    const id = new URL(request.url).searchParams.get("sessionId") ?? "";
    const answer = sessionAnswer(id, user.id);
    return answer ? Response.json({ answer: JSON.parse(answer) }) : Response.json({ answer: null }, { status: 202 });
  } catch (error) { return error instanceof Response ? error : Response.json({ error: "Unable to read stream" }, { status: 500 }); }
}
