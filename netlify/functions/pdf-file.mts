import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdfs } from "../../db/schema.js";

// Streams the actual PDF bytes back for preview/download and counts the
// download. Split from pdfs.mts so the file bytes never have to round-trip
// through JSON.
export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const id = Number((context.params as any)?.id);
  if (!id) return Response.json({ error: "Missing id." }, { status: 400 });

  const [row] = await db.select().from(pdfs).where(eq(pdfs.id, id));
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });

  const store = getStore("pdf-files");
  const file = await store.get(row.blobKey, { type: "arrayBuffer" });
  if (!file) return Response.json({ error: "File missing from storage." }, { status: 404 });

  await db.update(pdfs).set({ downloads: (row.downloads || 0) + 1 }).where(eq(pdfs.id, id));

  return new Response(file, {
    headers: {
      "content-type": row.contentType || "application/pdf",
      "content-disposition": `attachment; filename="${row.fileName.replace(/"/g, "")}"`,
    },
  });
};

export const config: Config = {
  path: "/api/pdfs/:id/file",
};
