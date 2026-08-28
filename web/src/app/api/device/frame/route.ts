import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { requireDevice } from "@/lib/device-auth";
import { liveFramePath } from "@/lib/live-frame";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let temporary: string | null = null;
  try {
    const form = await request.formData();
    const printerId = z.enum(["printer-1", "printer-2", "printer-3"]).parse(form.get("printerId"));
    requireDevice(request, printerId);
    z.string().datetime().parse(form.get("capturedAt"));
    const image = form.get("image");
    if (!(image instanceof File) || image.type !== "image/jpeg" || image.size < 100 || image.size > 2_000_000) return Response.json({ error: "A JPEG frame between 100 bytes and 2 MB is required" }, { status: 400 });
    const target = liveFramePath(printerId)!;
    await mkdir(path.dirname(target), { recursive: true });
    temporary = `${target}.${randomUUID()}.tmp`;
    const frame = await sharp(Buffer.from(await image.arrayBuffer())).rotate().resize({ width: 720, height: 480, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
    await writeFile(temporary, frame, { flag: "wx" });
    await rename(temporary, target);
    temporary = null;
    return Response.json({ ok: true, bytes: frame.length });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid live frame metadata" }, { status: 400 });
    console.error("live frame upload failed", error);
    return Response.json({ error: "Live frame processing failed" }, { status: 500 });
  } finally {
    if (temporary) await unlink(temporary).catch(() => undefined);
  }
}
