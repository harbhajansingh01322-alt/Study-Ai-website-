import { readSessionCookie, verifySession } from "../../server/auth.mjs";
import { storage } from "../../server/storage.mjs";

/** Require the same password-verified session as the StudyAI admin panel. */
export function createAdminGuard({ readAdminHash = () => storage.readAdminHash(), env = process.env } = {}) {
  return async function requireAdmin(req: Request): Promise<Response | null> {
    if (req.method !== "GET" && req.headers.get("origin") !== new URL(req.url).origin) {
      return Response.json({ error: "Invalid request origin." }, { status: 403 });
    }

    try {
      const hash = await readAdminHash() || env.STUDYAI_ADMIN_PASSWORD_HASH;
      const secret = env.STUDYAI_SESSION_SECRET;
      if (!hash || !secret) return Response.json({ error: "Admin configuration is unavailable." }, { status: 503 });
      if (!verifySession(readSessionCookie(req), hash, secret)) {
        return Response.json({ error: "Admin session required." }, { status: 401 });
      }
      return null;
    } catch {
      return Response.json({ error: "Admin authentication is unavailable." }, { status: 503 });
    }
  };
}

export const requireAdmin = createAdminGuard();
