import { randomUUID } from 'node:crypto';
import { storage } from './storage.mjs';
import { clearSessionCookie, createSession, hashPassword, readSessionCookie, sessionCookie, verifyPassword, verifySession } from './auth.mjs';
import { managedTypes, normalizeRecord, publicTypes } from './validation.mjs';

const baseHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { ...baseHeaders, 'Content-Type': 'application/json; charset=utf-8', ...headers } });
const failure = (message, status = 400) => json({ error: message }, status);
const clone = (value) => structuredClone(value);
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_PDF_BYTES = 4 * 1024 * 1024;

async function bodyJson(request) {
  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_JSON_BYTES) throw new Error('Request is too large.');
  try { return JSON.parse(body); }
  catch { throw new Error('Invalid JSON.'); }
}

function validOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}

function validatePdf(file) {
  if (!file || !file.size) return null;
  if (file.size > MAX_PDF_BYTES) throw new Error('PDF must be 4 MB or smaller.');
  if (file.type && file.type !== 'application/pdf') throw new Error('Upload a PDF file.');
  return file;
}

async function parseContentRequest(request, type) {
  if (type !== 'pdfs') return { ...(await bodyJson(request)), file: null };
  const size = Number(request.headers.get('content-length') || 0);
  if (size > MAX_PDF_BYTES + 1024 * 1024) throw new Error('Request is too large.');
  if (!(request.headers.get('content-type') || '').startsWith('multipart/form-data')) throw new Error('PDF requests must use a form.');
  const form = await request.formData();
  let record;
  try { record = JSON.parse(String(form.get('record') || '{}')); }
  catch { throw new Error('Invalid PDF details.'); }
  return { revision: String(form.get('revision') || ''), id: String(form.get('id') || ''), record, file: validatePdf(form.get('file')) };
}

export function createHandlers({ store = storage, env = process.env } = {}) {
  async function currentHash() {
    const hash = await store.readAdminHash() || env.STUDYAI_ADMIN_PASSWORD_HASH;
    if (!hash || !env.STUDYAI_SESSION_SECRET || env.STUDYAI_SESSION_SECRET.length < 32) throw new Error('Admin environment variables are missing.');
    return hash;
  }

  async function publicContent(request) {
    if (request.method !== 'GET') return failure('Method not allowed.', 405);
    const type = new URL(request.url).searchParams.get('type');
    if (!publicTypes.includes(type)) return failure('Invalid content type.');
    try {
      const snapshot = await store.readSnapshot();
      return json({ items: snapshot.data[type].filter((item) => item.status === 'Published') });
    } catch { return failure('Content is temporarily unavailable.', 503); }
  }

  async function publicPdf(request) {
    if (request.method !== 'GET') return failure('Method not allowed.', 405);
    const id = new URL(request.url).searchParams.get('id');
    if (!id || !/^[a-f0-9-]{36}$/i.test(id)) return failure('PDF not found.', 404);
    try {
      const snapshot = await store.readSnapshot();
      if (!snapshot.data.pdfs.some((item) => item.fileId === id && item.status === 'Published')) return failure('PDF not found.', 404);
      const bytes = await store.readPdf(id);
      if (!bytes) return failure('PDF not found.', 404);
      return new Response(bytes, { headers: { ...baseHeaders, 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="studyai-resource.pdf"' } });
    } catch { return failure('PDF is temporarily unavailable.', 503); }
  }

  async function admin(request) {
    const action = new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
    if (!['login', 'logout', 'session', 'content', 'settings', 'password'].includes(action)) return failure('Not found.', 404);
    if (request.method !== 'GET' && !validOrigin(request)) return failure('Invalid request origin.', 403);
    try {
      const hash = await currentHash();
      if (action === 'login') {
        if (request.method !== 'POST') return failure('Method not allowed.', 405);
        const input = await bodyJson(request);
        if (!verifyPassword(input.password, hash)) return failure('Invalid admin password.', 401);
        return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, createSession(hash, env.STUDYAI_SESSION_SECRET)) });
      }

      const authorized = verifySession(readSessionCookie(request), hash, env.STUDYAI_SESSION_SECRET);
      if (!authorized) return failure('Admin session required.', 401);
      if (action === 'session') return request.method === 'GET' ? json({ ok: true }) : failure('Method not allowed.', 405);
      if (action === 'logout') return request.method === 'POST' ? json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(request) }) : failure('Method not allowed.', 405);

      if (action === 'password') {
        if (request.method !== 'POST') return failure('Method not allowed.', 405);
        const input = await bodyJson(request);
        if (!verifyPassword(input.current, hash)) return failure('Current password is incorrect.', 401);
        const nextHash = hashPassword(input.next);
        await store.writeAdminHash(nextHash);
        return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, createSession(nextHash, env.STUDYAI_SESSION_SECRET)) });
      }

      const snapshot = await store.readSnapshot();
      if (action === 'settings') {
        if (request.method !== 'PUT') return failure('Method not allowed.', 405);
        const input = await bodyJson(request);
        if (input.revision !== snapshot.revision) return failure('Content changed in another session. Reload and try again.', 409);
        const siteName = String(input.settings?.siteName || '').trim();
        const contactEmail = String(input.settings?.contactEmail || '').trim();
        if (!siteName || siteName.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return failure('Enter a valid workspace name and contact email.');
        const next = { revision: randomUUID(), data: { ...snapshot.data, settings: { siteName, contactEmail, maintenance: input.settings.maintenance === true } } };
        await store.writeSnapshot(next);
        return json(next);
      }

      const type = new URL(request.url).searchParams.get('type');
      if (action !== 'content' || (request.method !== 'GET' && !managedTypes.includes(type))) return failure('Invalid content type.');
      if (request.method === 'GET') return json(snapshot);
      if (!['POST', 'PUT', 'DELETE'].includes(request.method)) return failure('Method not allowed.', 405);
      const input = request.method === 'DELETE' ? await bodyJson(request) : await parseContentRequest(request, type);
      if (input.revision !== snapshot.revision) return failure('Content changed in another session. Reload and try again.', 409);
      const data = clone(snapshot.data);
      const list = data[type];
      const index = request.method === 'POST' ? -1 : list.findIndex((item) => item.id === input.id);
      if (request.method !== 'POST' && index < 0) return failure('Record not found.', 404);

      if (request.method === 'DELETE') {
        const removed = list[index];
        if (type === 'categories' && ['courses', 'studyMaterials', 'pdfs', 'videos', 'quizzes', 'blogs'].some((key) => data[key].some((item) => item.category === removed.name))) return failure('Move or delete items in this category first.', 409);
        list.splice(index, 1);
        const next = { revision: randomUUID(), data };
        await store.writeSnapshot(next);
        if (type === 'pdfs' && removed.fileId) await store.deletePdf(removed.fileId).catch(() => {});
        return json(next);
      }

      const previous = index < 0 ? null : list[index];
      const record = normalizeRecord(type, input.record, previous);
      record.id = previous?.id || randomUUID();
      if (type !== 'categories' && type !== 'users' && !data.categories.some((category) => category.name === record.category)) return failure('Create this category first.');
      if (type === 'categories' && data.categories.some((item) => item.id !== record.id && item.name.toLowerCase() === record.name.toLowerCase())) return failure('Category name already exists.', 409);
      if (type === 'users' && data.users.some((item) => item.id !== record.id && item.email === record.email)) return failure('Email already exists.', 409);

      let uploadedId = null;
      let oldFileId = null;
      if (type === 'pdfs') {
        if (input.file) {
          const bytes = new Uint8Array(await input.file.arrayBuffer());
          if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') return failure('Upload a valid PDF file.');
          uploadedId = randomUUID();
          await store.writePdf(uploadedId, bytes);
          record.fileId = uploadedId;
          record.url = '';
          record.size = `${(bytes.byteLength / 1024 / 1024).toFixed(2)} MB`;
        } else if (record.url) {
          record.fileId = '';
          oldFileId = previous?.fileId;
        }
        if (!record.url && !record.fileId && !record.content) return failure('Add a PDF file or URL.');
      }

      if (type === 'categories' && previous && previous.name !== record.name) {
        for (const key of ['courses', 'studyMaterials', 'pdfs', 'videos', 'quizzes', 'blogs']) {
          for (const item of data[key]) if (item.category === previous.name) item.category = record.name;
        }
      }
      if (index < 0) list.unshift(record); else list[index] = record;
      const next = { revision: randomUUID(), data };
      try { await store.writeSnapshot(next); }
      catch (error) { if (uploadedId) await store.deletePdf(uploadedId).catch(() => {}); throw error; }
      if (uploadedId && previous?.fileId) oldFileId = previous.fileId;
      if (oldFileId) await store.deletePdf(oldFileId).catch(() => {});
      return json(next);
    } catch (error) {
      if (error.message === 'Admin environment variables are missing.') return failure(error.message, 503);
      if (error instanceof SyntaxError || error.message?.includes('not configured correctly')) return failure('Admin configuration is invalid.', 503);
      if (error.message && /^(Invalid|Enter|Add|Choose|Use|Upload|PDF|Request|Password|Category|Course|Material|Video|Quiz|Post|Article|Full name|Email|Lessons|Pages|Time limit|Question|Option|Correct|Text)/.test(error.message)) return failure(error.message);
      console.error('Admin API request failed:', error);
      return failure('Unable to complete the request.', 500);
    }
  }

  return { admin, publicContent, publicPdf };
}

export const handlers = createHandlers();
