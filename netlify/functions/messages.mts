import type { Config, Context } from "@netlify/functions";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { messages } from "../../db/schema.js";
import { requireAdmin } from "../lib/admin.js";

export default async (req: Request, context: Context) => {
  const id = (context.params as any)?.id ? Number((context.params as any).id) : null;

  // Anyone can submit the contact form.
  if (req.method === "POST") {
    const body = await req.json();
    const { name, email, subject, message } = body || {};
    if (!name || !email || !message) {
      return Response.json({ error: "name, email and message are required." }, { status: 400 });
    }
    const [row] = await db.insert(messages).values({ name, email, subject: subject || "", message }).returning();
    return Response.json(row, { status: 201 });
  }

  // Reading, marking read and deleting messages is admin-only.
  const denied = await requireAdmin(req);
  if (denied) return denied;

  if (req.method === "GET") {
    const rows = await db.select().from(messages).orderBy(desc(messages.createdAt));
    return Response.json(rows);
  }

  if (req.method === "PATCH") {
    if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
    const [row] = await db.update(messages).set({ read: true }).where(eq(messages.id, id)).returning();
    return Response.json(row);
  }

  if (req.method === "DELETE") {
    if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
    await db.delete(messages).where(eq(messages.id, id));
    return Response.json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: ["/api/messages", "/api/messages/:id"],
};
