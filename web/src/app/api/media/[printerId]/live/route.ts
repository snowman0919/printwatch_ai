import { readFile, stat } from "node:fs/promises";
import { requireSchoolUser } from "@/lib/auth";
import { liveFramePath } from "@/lib/live-frame";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ printerId: string }> }) {
  try {
    await requireSchoolUser();
    const file = liveFramePath((await context.params).printerId);
    if (!file) return new Response(null, { status: 404 });
    const [body, metadata] = await Promise.all([readFile(file), stat(file)]);
    return new Response(body, { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store", "x-frame-at": metadata.mtime.toISOString() } });
  } catch (error) {
    return error instanceof Response ? error : new Response(null, { status: 404 });
  }
}
