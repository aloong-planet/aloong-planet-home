// These have no DOM here and are checked by recorded real-browser runs, because the project's browser suite, packages/site-check, covers only page widths and where focus lands under the pinned header:
// the portrait requested at high priority, the sitting dog at low priority, the dog's motion sheets waiting for the
// page's load event, automatic wagging and pause/resume controls once motion sheets are ready, how the reduced
// portrait looks at its displayed size, and how the re-encoded motion sheets look as the dog plays. Dog visibility,
// reduced motion, pre-load pause and failed motion loading also need browser checks. Test them in the browser suite
// once it covers them.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {dogSprites, pageImages, motionSheets} from '../scripts/image-checks.mjs';
import {realSite} from './helpers/built-site.mjs';

test('the deployment check finds every image the real homepage shows, in page order', async () => {
  const html = await readFile(join(await realSite(), 'index.html'), 'utf8');
  assert.deepEqual(pageImages(html), [
    '/assets/aloong-cartoon.webp',
    '/assets/golden-wag/idle.png',
    '/assets/apps/transfer-main-light.jpg',
    '/assets/apps/agentshed-main-90days.png',
    '/assets/apps/justsnap-translate-zh.webp',
  ]);
  assert.equal(pageImages(html).length, html.match(/<img\b/g).length, 'an image the check cannot read would go unchecked');
});

test('the deployment check finds every motion sheet the real dog script loads, at the address the homepage requests', async () => {
  const script = await readFile(new URL('../assets/golden-interaction.js', import.meta.url), 'utf8');
  assert.deepEqual(motionSheets(script), [
    '/assets/golden-wag/motion-0.webp',
    '/assets/golden-wag/motion-1.webp',
    '/assets/golden-wag/motion-2.webp',
  ]);
});

test('the deployment check refuses a body that is not the dog script, such as the homepage a host serves for a missing file', async () => {
  const html = await readFile(join(await realSite(), 'index.html'), 'utf8');
  assert.throws(() => motionSheets(html), /not the dog script/);
});

test('both copies of the dog sprite manifest record the sheets the site ships', async () => {
  const shipped = async file => {
    const body = await readFile(new URL(`../assets/golden-wag/${file}`, import.meta.url));
    return {bytes: body.length, sha256: createHash('sha256').update(body).digest('hex')};
  };
  const manifest = JSON.parse(await readFile(new URL('../assets/golden-wag/config.json', import.meta.url), 'utf8'));
  const {config} = dogSprites(await readFile(new URL('../assets/golden-interaction.js', import.meta.url), 'utf8'));
  assert.deepEqual(config, manifest, 'the dog script carries its own copy of the manifest');
  assert.equal(manifest.sheets.length, 3);
  for (const sheet of manifest.sheets) assert.deepEqual(await shipped(sheet.file), {bytes: sheet.bytes, sha256: sheet.sha256}, sheet.file);
  assert.equal((await shipped(manifest.idle)).sha256, manifest.idleSha256);
});
