import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandlers } from '../server/api.mjs';
import { hashPassword } from '../server/auth.mjs';
import { initialContent } from '../server/seed.mjs';

const origin = 'https://studyai.example';
const env = { STUDYAI_ADMIN_PASSWORD_HASH: hashPassword('Example-Admin-Passphrase-2026'), STUDYAI_SESSION_SECRET: 'a-local-test-session-secret-with-more-than-32-characters' };

function fixture() {
  let snapshot;
  let adminHash;
  const files = new Map();
  const store = {
    async readSnapshot() { return structuredClone(snapshot || { revision: 'seed', data: initialContent }); },
    async writeSnapshot(value) { snapshot = structuredClone(value); },
    async readAdminHash() { return adminHash; },
    async writeAdminHash(value) { adminHash = value; },
    async writePdf(id, bytes) { files.set(id, new Uint8Array(bytes)); },
    async readPdf(id) { return files.get(id)?.buffer || null; },
    async deletePdf(id) { files.delete(id); }
  };
  return { ...createHandlers({ store, env }), store, files };
}

function request(path, method = 'GET', body, cookie) {
  const headers = {};
  if (method !== 'GET') headers.Origin = origin;
  if (cookie) headers.Cookie = cookie;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  return new Request(origin + path, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
}

async function login(api) {
  const response = await api.admin(request('/api/admin/login', 'POST', { password: 'Example-Admin-Passphrase-2026' }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  return response.headers.get('set-cookie').split(';')[0];
}

test('admin authentication protects writes and enforces origin', async () => {
  const api = fixture();
  assert.equal((await api.admin(request('/api/admin/login', 'POST', { password: 'wrong-password' }))).status, 401);
  assert.equal((await api.admin(request('/api/admin/content?type=courses', 'POST', { revision: 'seed', record: {} }))).status, 401);
  const cookie = await login(api);
  const crossSite = new Request(origin + '/api/admin/content?type=courses', { method: 'POST', headers: { Origin: 'https://evil.example', Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal((await api.admin(crossSite)).status, 403);
  assert.equal((await api.admin(request('/api/admin/session', 'GET', null, cookie))).status, 200);
  const logout = await api.admin(request('/api/admin/logout', 'POST', null, cookie));
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
});

test('published courses persist across handler instances and drafts disappear from public reads', async () => {
  const api = fixture(); const cookie = await login(api);
  const initial = await (await api.admin(request('/api/admin/content', 'GET', null, cookie))).json();
  assert.equal(initial.data.courses.length, 4);
  const record = { title: 'Live Practice Course', category: 'CGL', instructor: 'StudyAI', lessons: 10, description: 'A new course', url: '/quiz.html', status: 'Published' };
  const createdResponse = await api.admin(request('/api/admin/content?type=courses', 'POST', { revision: initial.revision, record }, cookie));
  assert.equal(createdResponse.status, 200);
  const created = await createdResponse.json();
  const id = created.data.courses[0].id;
  assert.ok(id);
  const secondInstance = createHandlers({ store: api.store, env });
  assert.ok((await (await secondInstance.publicContent(request('/api/content?type=courses'))).json()).items.some((item) => item.id === id));
  const stale = await api.admin(request('/api/admin/content?type=courses', 'PUT', { revision: initial.revision, id, record: { ...record, status: 'Draft' } }, cookie));
  assert.equal(stale.status, 409);
  const updated = await (await api.admin(request('/api/admin/content?type=courses', 'PUT', { revision: created.revision, id, record: { ...record, status: 'Draft' } }, cookie))).json();
  assert.equal((await (await api.publicContent(request('/api/content?type=courses'))).json()).items.some((item) => item.id === id), false);
  const deleted = await (await api.admin(request('/api/admin/content?type=courses', 'DELETE', { revision: updated.revision, id }, cookie))).json();
  assert.equal(deleted.data.courses.some((item) => item.id === id), false);
});

test('every remaining public content type supports publish, edit, and delete', async () => {
  const api = fixture(); const cookie = await login(api);
  const records = {
    studyMaterials: { title: 'Live Study Guide', category: 'CGL', lessons: 3, description: '', url: '/quiz.html', status: 'Published' },
    videos: { title: 'Live Video', category: 'CGL', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '3:32', description: '', status: 'Published' },
    quizzes: { title: 'Live Quiz', category: 'CGL', minutes: 5, questions: [{ question: 'One plus one?', options: ['1', '2', '3', '4'], correct: 1 }], status: 'Published' },
    blogs: { title: 'Live Blog', category: 'CGL', author: 'StudyAI', excerpt: 'A useful article', body: 'Full article body.', status: 'Published' }
  };
  for (const [type, record] of Object.entries(records)) {
    const before = await (await api.admin(request('/api/admin/content', 'GET', null, cookie))).json();
    const response = await api.admin(request(`/api/admin/content?type=${type}`, 'POST', { revision: before.revision, record }, cookie));
    assert.equal(response.status, 200, type + ' create');
    const created = await response.json(); const item = created.data[type][0];
    assert.ok((await (await api.publicContent(request(`/api/content?type=${type}`))).json()).items.some((entry) => entry.id === item.id), type + ' published');
    const edit = await api.admin(request(`/api/admin/content?type=${type}`, 'PUT', { revision: created.revision, id: item.id, record: { ...record, status: 'Draft' } }, cookie));
    assert.equal(edit.status, 200, type + ' edit');
    const updated = await edit.json();
    assert.equal((await (await api.publicContent(request(`/api/content?type=${type}`))).json()).items.some((entry) => entry.id === item.id), false, type + ' draft');
    const remove = await api.admin(request(`/api/admin/content?type=${type}`, 'DELETE', { revision: updated.revision, id: item.id }, cookie));
    assert.equal(remove.status, 200, type + ' delete');
  }
  const badVideo = await api.admin(request('/api/admin/content?type=videos', 'POST', { revision: (await (await api.admin(request('/api/admin/content', 'GET', null, cookie))).json()).revision, record: { ...records.videos, url: 'https://www.youtube.com/watch' } }, cookie));
  assert.equal(badVideo.status, 400);
});

test('PDF upload is stored and public only while published', async () => {
  const api = fixture(); const cookie = await login(api);
  const snapshot = await (await api.admin(request('/api/admin/content', 'GET', null, cookie))).json();
  const form = new FormData();
  form.set('revision', snapshot.revision);
  form.set('record', JSON.stringify({ title: 'Uploaded Notes', category: 'Notes', pages: 1, description: 'Live PDF', url: '', status: 'Published' }));
  form.set('file', new File([new TextEncoder().encode('%PDF-1.4\n1 0 obj\n')], 'notes.pdf', { type: 'application/pdf' }));
  const response = await api.admin(request('/api/admin/content?type=pdfs', 'POST', form, cookie));
  assert.equal(response.status, 200);
  const created = await response.json();
  const pdf = created.data.pdfs[0];
  assert.ok(api.files.has(pdf.fileId));
  assert.equal((await api.publicPdf(request('/api/pdf?id=' + pdf.fileId))).status, 200);
  const updated = await (await api.admin(request('/api/admin/content?type=pdfs', 'PUT', (() => { const body = new FormData(); body.set('revision', created.revision); body.set('id', pdf.id); body.set('record', JSON.stringify({ ...pdf, status: 'Draft' })); return body; })(), cookie))).json();
  assert.equal((await api.publicPdf(request('/api/pdf?id=' + pdf.fileId))).status, 404);
  const removed = await api.admin(request('/api/admin/content?type=pdfs', 'DELETE', { revision: updated.revision, id: pdf.id }, cookie));
  assert.equal(removed.status, 200);
  assert.equal(api.files.has(pdf.fileId), false);
});

test('category integrity and password change invalidate old session', async () => {
  const api = fixture(); const cookie = await login(api);
  const snapshot = await (await api.admin(request('/api/admin/content', 'GET', null, cookie))).json();
  const used = snapshot.data.categories.find((item) => item.name === 'CGL');
  assert.equal((await api.admin(request('/api/admin/content?type=categories', 'DELETE', { revision: snapshot.revision, id: used.id }, cookie))).status, 409);
  const password = await api.admin(request('/api/admin/password', 'POST', { current: 'Example-Admin-Passphrase-2026', next: 'Second-Example-Passphrase-2026' }, cookie));
  assert.equal(password.status, 200);
  assert.equal((await api.admin(request('/api/admin/session', 'GET', null, cookie))).status, 401);
  assert.equal((await api.admin(request('/api/admin/login', 'POST', { password: 'Second-Example-Passphrase-2026' }))).status, 200);
});

test('categories publish, rename, and delete through the public content API', async () => {
  const api = fixture(); const cookie = await login(api);
  const before = await (await api.admin(request('/api/admin/content', 'GET', null, cookie))).json();
  const record = { name: 'Hindi Notes', description: '', status: 'Published' };
  const createdResponse = await api.admin(request('/api/admin/content?type=categories', 'POST', { revision: before.revision, record }, cookie));
  assert.equal(createdResponse.status, 200);
  const created = await createdResponse.json(); const category = created.data.categories[0];
  assert.ok((await (await api.publicContent(request('/api/content?type=categories'))).json()).items.some((item) => item.id === category.id));
  const renamedResponse = await api.admin(request('/api/admin/content?type=categories', 'PUT', { revision: created.revision, id: category.id, record: { ...record, name: 'Hindi Resources', status: 'Draft' } }, cookie));
  assert.equal(renamedResponse.status, 200);
  const renamed = await renamedResponse.json();
  assert.equal((await (await api.publicContent(request('/api/content?type=categories'))).json()).items.some((item) => item.id === category.id), false);
  const deleted = await api.admin(request('/api/admin/content?type=categories', 'DELETE', { revision: renamed.revision, id: category.id }, cookie));
  assert.equal(deleted.status, 200);
});
