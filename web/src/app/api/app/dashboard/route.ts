import { requireSchoolUser } from "@/lib/auth";
import { dashboardData } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET() {
  try { await requireSchoolUser(); return Response.json({ printers: dashboardData(), generatedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store" } }); }
  catch (error) { return error instanceof Response ? error : Response.json({ error: "Unable to load dashboard" }, { status: 500 }); }
}
