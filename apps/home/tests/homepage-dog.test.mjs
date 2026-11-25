// homepage-dog on the built homepages: what each language's page says for the dog's status lines and its button. The dog's motion and
// the line it shows in each state are driven in a real browser by packages/site-check/tests/homepage-dog.test.mjs.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readBuilt} from './helpers/built-site.mjs';

// What the dog says about itself, for assistive technology, on each language's homepage (homepage-dog::REQ-002); the dog script reads
// these from the page, so it holds no sentence of its own.
const DOG_LINES = {
  'index.html': {resting: '静静陪着你', greeting: '很高兴见到你', wagging: '见到你，就忍不住摇尾巴', paused: '好啦，乖乖坐好', unavailable: '小狗先静静陪着你，刷新后再试试'},
  'en/index.html': {resting: 'Sitting quietly beside you', greeting: 'Nice to see you', wagging: "Can't help wagging my tail when I see you", paused: 'All right, sitting nicely', unavailable: 'The dog is keeping you company quietly for now; refresh to try again'},
};
for (const [page, lines] of Object.entries(DOG_LINES)) {
  test(`homepage-dog::REQ-002: ${page} carries the dog's five status lines for the dog script, and its button's name`, async () => {
    const html = await readBuilt(page);
    const status = html.match(/<span id="goldenStatus"([^>]*)>/)[1];
    assert.deepEqual(Object.fromEntries([...status.matchAll(/\sdata-([a-z]+)="([^"]*)"/g)].map(([, name, value]) => [name, value])), lines);
    const name = page === 'index.html' ? '小狗摇尾巴' : 'Dog wagging its tail';
    assert.ok(html.includes(`<button class="golden-trigger" id="goldenTrigger" type="button" aria-label="${name}" aria-pressed="true">`), name);
  });
}
