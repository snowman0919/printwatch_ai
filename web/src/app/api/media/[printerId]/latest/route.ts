import { readFile } from "node:fs/promises";
import { requireSchoolUser } from "@/lib/auth";
import { latestMediaPath } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ printerId: string }> }) {
  try {
    await requireSchoolUser();
    const { printerId } = await context.params;
    const file = latestMediaPath(printerId);
    if (!file) return new Response(null, { status: 404 });
    return new Response(await readFile(file), { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store" } });
  } catch (error) { return error instanceof Response ? error : new Response(null, { status: 404 }); }
}
