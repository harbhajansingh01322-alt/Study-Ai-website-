import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

// Keep the password off the shell command line and out of terminal echo.
const hiddenOutput = new Writable({ write(_chunk, _encoding, done) { done(); } });
const reader = createInterface({ input: process.stdin, output: hiddenOutput, terminal: process.stdin.isTTY });
try {
  if (process.stdin.isTTY) process.stdout.write('New admin password (12+ characters): ');
  const password = (await reader.question('')).replace(/[\r\n]+$/, '');
  if (process.stdin.isTTY) process.stdout.write('\n');
  if (password.length < 12) throw new Error('Use at least 12 characters.');
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 32);
  console.log(`STUDYAI_ADMIN_PASSWORD_HASH=scrypt$${salt.toString('base64url')}$${digest.toString('base64url')}`);
  console.log('Set this value in Netlify environment variables. Do not commit it.');
} finally {
  reader.close();
}
