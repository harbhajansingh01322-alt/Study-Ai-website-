import { getStore } from '@netlify/blobs';
import { initialContent } from './seed.mjs';

const copy = (value) => structuredClone(value);

export function createStorage(storeFactory = getStore) {
  const content = () => storeFactory({ name: 'studyai-content', consistency: 'strong' });
  const security = () => storeFactory({ name: 'studyai-security', consistency: 'strong' });
  const files = () => storeFactory({ name: 'studyai-pdf-files', consistency: 'strong' });

  return {
    async readSnapshot() {
      const stored = await content().get('snapshot', { type: 'json', consistency: 'strong' });
      if (stored?.data && typeof stored.revision === 'string') return stored;
      return { revision: 'seed', data: copy(initialContent) };
    },
    async writeSnapshot(snapshot) {
      await content().setJSON('snapshot', snapshot);
    },
    async readAdminHash() {
      return security().get('admin-password-hash', { consistency: 'strong' });
    },
    async writeAdminHash(value) {
      await security().set('admin-password-hash', value);
    },
    async writePdf(id, bytes) {
      await files().set(id, bytes, { metadata: { contentType: 'application/pdf' } });
    },
    async readPdf(id) {
      return files().get(id, { type: 'arrayBuffer', consistency: 'strong' });
    },
    async deletePdf(id) {
      await files().delete(id);
    }
  };
}

export const storage = createStorage();
