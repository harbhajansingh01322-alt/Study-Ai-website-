import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdfs } from "../../db/schema.js";
import { requireAdmin } from "../lib/admin.js";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export default async (req: Request, context: Context) => {
  const id = (context.params as any)?.id ? Number((context.params as any).id) : null;

  if (req.method === "GET") {
    const rows = await db.select().from(pdfs).orderBy(desc(pdfs.createdAt));
    return Response.json(rows);
  }

  if (req.method === "POST") {
    const denied = requireAdmin(req);
    if (denied) return denied;

    const body = await req.json();
    const { title, category, exam, description, pages, fileName, contentType, fileBase64 } = body || {};

    if (!title || !category || !fileName || !fileBase64) {
      return Response.json({ error: "title, category, fileName and fileBase64 are required." }, { status: 400 });
    }

    let buf: Buffer;
    try {
      buf = Buffer.from(fileBase64, "base64");
    } catch {
      return Response.json({ error: "fileBase64 could not be decoded." }, { status: 400 });
    }

    if (buf.byteLength === 0) {
      return Response.json({ error: "Uploaded file is empty." }, { status: 400 });
    }
    if (buf.byteLength > MAX_FILE_BYTES) {
      return Response.json({ error: "File is larger than the 20 MB limit." }, { status: 400 });
    }

    // Slice out a plain ArrayBuffer — Buffer may be a view into a larger
    // shared pool, so buf.buffer alone would include neighboring bytes.
    const bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

    const blobKey = `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const store = getStore("pdf-files");
    await store.set(blobKey, bytes);

    const [row] = await db
      .insert(pdfs)
      .values({
        title,
        category,
        exam: exam || "All",
        description: description || "",
        pages: Number(pages) || 0,
        fileName,
        fileSize: bytes.byteLength,
        contentType: contentType || "application/pdf",
        blobKey,
      })
      .returning();

    return Response.json(row, { status: 201 });
  }

  if (req.method === "DELETE") {
    const denied = requireAdmin(req);
    if (denied) return denied;

    if (!id) return Response.json({ error: "Missing id." }, { status: 400 });

    const [row] = await db.select().from(pdfs).where(eq(pdfs.id, id));
    if (!row) return Response.json({ error: "Not found." }, { status: 404 });

    const store = getStore("pdf-files");
    await store.delete(row.blobKey);
    await db.delete(pdfs).where(eq(pdfs.id, id));

    return Response.json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: ["/api/pdfs", "/api/pdfs/:id"],
};
