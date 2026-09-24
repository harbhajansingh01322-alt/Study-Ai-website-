import type { Config, Context } from "@netlify/functions";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { blogPosts } from "../../db/schema.js";
import { requireAdmin } from "../lib/admin.js";

export default async (req: Request, context: Context) => {
  const id = (context.params as any)?.id ? Number((context.params as any).id) : null;

  if (req.method === "GET") {
    const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
    return Response.json(rows);
  }

  if (req.method === "POST") {
    const denied = requireAdmin(req);
    if (denied) return denied;

    const body = await req.json();
    const { title, category, excerpt, content, readTime } = body || {};
    if (!title || !content) {
      return Response.json({ error: "title and content are required." }, { status: 400 });
    }

    const [row] = await db
      .insert(blogPosts)
      .values({
        title,
        category: category || "Exam Tips",
        excerpt: excerpt || content.slice(0, 140),
        content,
        readTime: readTime || "5 min",
      })
      .returning();

    return Response.json(row, { status: 201 });
  }

  if (req.method === "DELETE") {
    const denied = requireAdmin(req);
    if (denied) return denied;
    if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return Response.json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: ["/api/blog", "/api/blog/:id"],
};
