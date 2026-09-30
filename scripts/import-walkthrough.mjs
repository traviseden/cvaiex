import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const run = promisify(execFile);
const url = 'https://www.youtube.com/watch?v=aJVOkmzvzcw';
const folder = fileURLToPath(new URL('../references/downtown-mall/', import.meta.url));
await mkdir(folder, { recursive: true });
const args = ['--no-playlist', '--js-runtimes', 'node'];
const { stdout } = await run('yt-dlp', [...args, '--skip-download', '--dump-single-json', url], { maxBuffer: 20000000, timeout: 120000 });
const info = JSON.parse(stdout);
const video = join(folder, 'walkthrough.mp4');
console.log(`${info.title} · ${info.duration}s · ${info.uploader}`);
await run('yt-dlp', [...args, '-f', 'worst[ext=mp4]/worst', '-o', video, url], { maxBuffer: 20000000, timeout: 300000 });
await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', video, '-vf', 'fps=1/5:start_time=0,scale=384:-2', '-q:v', '8', join(folder, 'frame-%04d.jpg')], { timeout: 240000 });
await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '1', '-i', join(folder, 'frame-%04d.jpg'), '-vf', "select='not(mod(n,6))',scale=240:-2,tile=6x6", '-frames:v', '1', '-update', '1', join(folder, 'overview.jpg')], { timeout: 60000 });
await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '1', '-start_number', '49', '-i', join(folder, 'frame-%04d.jpg'), '-vf', 'scale=320:-2,tile=4x2', '-frames:v', '1', '-update', '1', join(folder, 'chalkboard-0400-0430.jpg')], { timeout: 60000 });
const frames = (await readdir(folder)).filter(name => /^frame-\d+\.jpg$/.test(name)).sort();
const subtitles = Object.keys(info.subtitles ?? {}), automaticCaptions = Object.keys(info.automatic_captions ?? {});
const manifest = {
  source: url, title: info.title, creator: info.uploader, durationSeconds: info.duration,
  retrievedAt: new Date().toISOString(), sampleIntervalSeconds: 5, maxWidth: 384,
  license: info.license ?? 'No reuse license supplied by the video metadata',
  usage: 'Private development references; these frames are not included in public/ or dist/.',
  transcript: { subtitles, automaticCaptions, status: subtitles.length || automaticCaptions.length ? 'Captions are available at the source; inspect their language/source before transcription.' : 'YouTube exposes no uploaded or automatic captions for this video. No transcript was invented.' },
  frames: frames.map((file, index) => ({ file, approximateTimeSeconds: index * 5, source: `${url}&t=${index * 5}s` })),
};
await writeFile(join(folder, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(folder, 'REFERENCE.md'), `# Downtown Mall walkthrough reference\n\n${info.title}\n\nCreator: ${info.uploader}\n\nSource: ${url}\n\n${frames.length} low-resolution frames sampled about every five seconds. See manifest.json for timestamps, overview.jpg for a contact sheet, and chalkboard-0400-0430.jpg for the requested wall segment.\n\n${manifest.transcript.status}\n\nThese reference frames are kept outside the static-site assets.\n`);
console.log(`Saved ${frames.length} low-resolution frames and two contact sheets. ${manifest.transcript.status}`);
