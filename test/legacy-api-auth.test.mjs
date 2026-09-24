import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminGuard } from '../netlify/lib/admin.ts';
import { createSession, hashPassword, sessionCookie, clearSessionCookie } from '../server/auth.mjs';

const origin = 'https://studyai.example';
const hash = hashPassword('Example-Admin-Passphrase-2026');
const secret = 'a-local-test-session-secret-with-more-than-32-characters';
const guard = createAdminGuard({ readAdminHash: async () => null, env: { STUDYAI_ADMIN_PASSWORD_HASH: hash, STUDYAI_SESSION_SECRET: secret } });
const cookie = sessionCookie(new Request(origin + '/api/admin/login'), createSession(hash, secret)).split(';')[0];

test('legacy content endpoints reject forged role headers and cross-origin writes', async () => {
  const forged = new Request(origin + '/api/materials', {
    method: 'POST', headers: { Origin: origin, 'x-user-role': 'admin', 'x-user-email': 'fake-admin@example.test' }
  });
  assert.equal((await guard(forged)).status, 401);

  const crossOrigin = new Request(origin + '/api/materials', {
    method: 'POST', headers: { Origin: 'https://other.example', Cookie: cookie }
  });
  assert.equal((await guard(crossOrigin)).status, 403);

  const authorized = new Request(origin + '/api/materials', {
    method: 'POST', headers: { Origin: origin, Cookie: cookie }
  });
  assert.equal(await guard(authorized), null);
});

test('admin cookie reaches all API paths and logout clears that same cookie', () => {
  const request = new Request(origin + '/api/admin/login');
  const issued = sessionCookie(request, createSession(hash, secret));
  const cleared = clearSessionCookie(request);
  assert.match(issued, /^studyai_admin_v2=/);
  assert.match(issued, /Path=\/api; HttpOnly; SameSite=Strict/);
  assert.match(cleared, /^studyai_admin_v2=/);
  assert.match(cleared, /Path=\/api; HttpOnly; SameSite=Strict; Max-Age=0/);
});
