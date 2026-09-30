import { mkdir, writeFile } from 'node:fs/promises';
import catalog from '../public/data/storefronts.json' with { type: 'json' };

const headers = { 'User-Agent': 'CvilleAIExplorersPrototype/0.1 (https://www.cvaiex.org/)' };
await mkdir(new URL('../public/media/mall/', import.meta.url), { recursive: true });
for (const image of catalog.media) {
  if (!image.fileTitle) continue;
  const params = new URLSearchParams({ action: 'query', titles: image.fileTitle, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1000', format: 'json' });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers });
  if (!response.ok) throw new Error(`Commons metadata failed: ${response.status}`);
  const data = await response.json();
  const info = Object.values(data.query.pages)[0]?.imageinfo?.[0];
  if (!info || info.extmetadata.LicenseShortName.value !== image.license) throw new Error(`Missing image or changed license: ${image.id}`);
  const file = await fetch(info.thumburl ?? info.url, { headers });
  if (!file.ok || !file.headers.get('content-type')?.startsWith('image/')) throw new Error(`Photo download failed: ${image.id} (${file.status})`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > 10000000) throw new Error('Photo exceeds 10 MB');
  await writeFile(new URL(`../public${image.src}`, import.meta.url), bytes);
  console.log(`Downloaded ${image.id} (${Math.round(bytes.length / 1024)} KB), ${image.license}.`);
}
