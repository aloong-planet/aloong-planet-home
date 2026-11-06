// These have no DOM here and are checked by recorded real-browser runs, because the project has no browser test suite:
// the portrait requested at high priority, the sitting dog at low priority, the dog's motion sheets waiting for the
// page's load event, the dog still greeting a pointer that arrived before its motion sheets, and how the reduced
// portrait looks at its displayed size. Test them here once the browser suite capability is enabled.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {homepageImages} from '../scripts/image-checks.mjs';

test('the deployment check finds every image the real homepage shows, in page order', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.deepEqual(homepageImages(html), [
    '/assets/aloong-cartoon.webp',
    '/assets/golden-wag/idle.png',
    '/assets/apps/transfer-main-light.jpg',
    '/assets/apps/agentshed-main-90days.png',
  ]);
  assert.equal(homepageImages(html).length, html.match(/<img\b/g).length, 'an image the check cannot read would go unchecked');
});
