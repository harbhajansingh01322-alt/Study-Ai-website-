/**
 * Admin check shared by content-management functions.
 *
 * NOTE: StudyAI's login system is a client-side demo (see js/main.js /
 * AuthManager) — there is no real password-verified session token. Any
 * email containing "admin" is treated as an admin in the browser. To keep
 * the same trust model consistently, write endpoints trust the
 * `x-user-role` / `x-user-email` headers the client sends, and re-check
 * that the email actually contains "admin" server-side. This is enough to
 * stop accidental writes from regular students, but it is NOT secure
 * against a user editing headers by hand — a real deployment should
 * replace this with Netlify Identity or another real auth provider before
 * going to production with untrusted users.
 */
export function isAdminRequest(req: Request): boolean {
  const role = req.headers.get("x-user-role") || "";
  const email = (req.headers.get("x-user-email") || "").toLowerCase();
  return role === "admin" && email.includes("admin");
}

export function requireAdmin(req: Request): Response | null {
  if (!isAdminRequest(req)) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }
  return null;
}
