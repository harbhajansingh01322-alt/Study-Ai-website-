# StudyAI

StudyAI is a static learning website with a Netlify admin panel at `/admin.html`. The admin panel manages categories, courses, study material, PDFs, YouTube videos, quizzes, blog posts, sample user profiles, and workspace settings. Published content is read by the public pages from Netlify Functions and stored persistently in Netlify Blobs. Firebase is not used by the admin panel.

## Run locally

Node.js 24 or newer is recommended. Install dependencies, configure a local admin password, and start Netlify Dev:

```bash
npm ci
npm run admin:hash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Copy `.env.example` to `.env`. Put the generated `STUDYAI_ADMIN_PASSWORD_HASH` and a separate random value of at least 32 characters in `STUDYAI_SESSION_SECRET`. Keep `.env` private. Then run:

```bash
npm run build
npm run dev -- --offline --port 8888 --no-open --dir dist
```

Open `http://localhost:8888/admin.html` and sign in with the password entered when generating the hash. The website is at `http://localhost:8888/`. Netlify Dev uses local blob storage; its content is separate from production. A plain static file server can display the original fallback content, but cannot run the admin API.

## Deploy on Netlify

1. Connect this GitHub repository to a Netlify site. `netlify.toml` builds the `dist` directory and deploys the functions.
2. In the Netlify site's environment variables, set `STUDYAI_ADMIN_PASSWORD_HASH` and `STUDYAI_SESSION_SECRET`. Generate the hash and secret with the commands above. Use site/function availability for both values and redeploy after adding them.
3. Visit `https://YOUR-SITE.netlify.app/admin.html` and sign in. Use **Published** to make an item visible on the public website; **Draft** and **Review** stay private.

Admin sessions use an HttpOnly, SameSite cookie and same-origin write checks. The password is verified with scrypt in the server function. Changing it in Settings invalidates older sessions. Keep the two environment variables private; never commit `.env` or the generated hash/secret. Netlify Blobs stores content across deploys. The admin UI accepts PDF uploads up to 4 MB or external PDF URLs; uploaded PDFs are served only while their record is published.

The initial content is copied from this repository's existing pages. Existing sample PDF entries contain text previews, not uploaded PDF binaries. Replace them through the admin panel to provide actual downloadable PDFs. Public page accounts and favorites from the original website still use browser-local data; the **Users** section is explicitly sample data and does not grant access. This admin panel does not change the existing public authentication system.

## Checks

```bash
npm test
npm run build
```

The source files live at the repository root; the build script copies only public HTML, CSS, and JavaScript to `dist`. The `server/` and `netlify/functions/` files provide the server-side API and are never copied into the public directory.
