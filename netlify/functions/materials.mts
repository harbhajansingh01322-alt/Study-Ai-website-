import type { Config, Context } from "@netlify/functions";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { materials } from "../../db/schema.js";
import { requireAdmin } from "../lib/admin.js";

export default async (req: Request, context: Context) => {
  const id = (context.params as any)?.id ? Number((context.params as any).id) : null;

  if (req.method === "GET") {
    const rows = await db.select().from(materials).orderBy(desc(materials.createdAt));
    return Response.json(rows);
  }

  if (req.method === "POST") {
    const denied = await requireAdmin(req);
    if (denied) return denied;

    const body = await req.json();
    const { title, category, icon, color, content } = body || {};
    if (!title || !category || !content) {
      return Response.json({ error: "title, category and content are required." }, { status: 400 });
    }

    const [row] = await db
      .insert(materials)
      .values({ title, category, icon: icon || "fa-book", color: color || "#6366f1", content })
      .returning();

    return Response.json(row, { status: 201 });
  }

  if (req.method === "DELETE") {
    const denied = await requireAdmin(req);
    if (denied) return denied;
    if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
    await db.delete(materials).where(eq(materials.id, id));
    return Response.json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: ["/api/materials", "/api/materials/:id"],
};
