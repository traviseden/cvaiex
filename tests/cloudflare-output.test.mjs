import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { writeCloudflareStaticOutput } from '../scripts/cloudflare-static-output.mjs';

test('the static build writes validated cf output with no server bundle or bindings', async () => {
  await mkdir('test-results', { recursive: true });
  const root = await mkdtemp(join(resolve('test-results'), 'cf-output-'));
  try {
    const dist = join(root, 'dist'); await mkdir(join(dist, 'data'), { recursive: true });
    await writeFile(join(root, 'cloudflare.config.ts'), `export default { worker: { name: 'cvaiex', compatibilityDate: '2026-09-30', workersDev: true, assets: { htmlHandling: 'auto-trailing-slash', notFoundHandling: '404-page' } } };`);
    await writeFile(join(dist, 'index.html'), '<h1>Cville AI Explorers</h1>');
    await writeFile(join(dist, 'data/catalog.json'), '{"revision":2}');
    const output = await writeCloudflareStaticOutput(root, dist);
    assert.equal(output.workers.default.config.name, 'cvaiex');
    assert.equal(output.workers.default.bundleDir, undefined);
    assert.equal(output.workers.default.config.manifest, undefined);
    assert.equal(output.workers.default.config.env, undefined);
    assert.equal(await readFile(join(output.workers.default.assetsDir, 'data/catalog.json'), 'utf8'), '{"revision":2}');
    assert.deepEqual(output.rootConfig.buildContext, { isPreview: false, mode: 'production' });
  } finally { await rm(root, { recursive: true, force: true }); }
});
