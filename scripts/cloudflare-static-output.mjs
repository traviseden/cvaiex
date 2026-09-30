import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadAndParseConfig } from '@cloudflare/config';
import {
  cleanBuildOutputDir, writeAssets, writeWorkerConfig,
  writeRootConfig, readBuildOutput,
} from '@cloudflare/build-output-utils';

// Use Cloudflare's own pinned writer/validator for its beta Build Output Spec.
// Project-relative paths keep both the checkout and folder rename portable.
export async function writeCloudflareStaticOutput(root, sourceDirectory) {
  await access(join(sourceDirectory, 'index.html'));
  const context = { isPreview: false, mode: 'production' };
  const { result } = await loadAndParseConfig(join(root, 'cloudflare.config.ts'), context);
  if (!result.success) throw new Error(`Invalid Cloudflare configuration: ${result.error.message}`);
  const { worker, containers, ...settings } = result.data;
  if (!worker || worker.entrypoint || containers?.length) throw new Error('This deployment must be an assets-only Worker');
  await cleanBuildOutputDir(root);
  await writeAssets({ root, sourceDirectory });
  await writeWorkerConfig({ root, config: worker });
  await writeRootConfig(root, settings, context);
  const output = await readBuildOutput(root);
  if (!output.workers.default.assetsDir || output.workers.default.bundleDir) throw new Error('Expected validated static assets without a server bundle');
  return output;
}

/** @returns {import('astro').AstroIntegration} */
export function cloudflareStaticOutput() {
  let root;
  return {
    name: 'cvaiex-cloudflare-static-output',
    hooks: {
      'astro:config:done': ({ config }) => { root = fileURLToPath(config.root); },
      'astro:build:done': async ({ dir, logger }) => {
        const output = await writeCloudflareStaticOutput(root, fileURLToPath(dir));
        logger.info(`Validated assets-only Cloudflare output for ${output.workers.default.config.name}`);
      },
    },
  };
}
