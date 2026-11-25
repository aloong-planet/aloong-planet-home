// The homepage site's palette in the light and in the dark appearance, read from the two shared stylesheets as written
// (site-appearance::QR-001/AC-01, blog::US-003/AC-10, site-appearance::REQ-002/AC-01). Nothing here renders a page:
// what a browser paints is checked by packages/site-check/tests/site-appearance.test.mjs, which also covers what these
// cases cannot see, such as a text drawn on a ground the stylesheets do not name.
//
// Gaps, kept here so they are not mistaken for coverage:
//   - Which ground each text token is drawn on is written out in PAIRS below from reading the two stylesheets; a new rule
//     that puts a listed text token on a ground not listed here is caught only by the browser case, which measures the page.
//   - Diagram colours (the `.post-<slug>` custom properties and the colours written inside drawings) are not read here:
//     they keep their light values in both appearances, on a light sheet.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contrast, darkRules, declarations, flatRules, isColour, parseColour, readSheet, resolve, tokensOf, writtenColours} from './helpers/palette.mjs';

const siteCss = await readSheet('site.css');
const articleCss = await readSheet('article.css');

const site = tokensOf(siteCss, '.ap-site');
const article = tokensOf(articleCss, '.ap-article');

const colourNames = tokens => [...tokens.keys()].filter(name => isColour(tokens.get(name))).sort();
/** The tokens a page of the site sees in one appearance, and those an article sees: the site's, overridden by the article's own. */
const seen = appearance => ({
  site: new Map(site[appearance]),
  article: new Map([...site[appearance], ...article[appearance]]),
});
const colourOf = (tokens, name) => parseColour(resolve(`var(${name})`, tokens));

// Every text token with each ground it is drawn on, and the lowest contrast it must keep there. Read from site.css and article.css.
const AT_LEAST = 4.5, POST_ACCENT = 5;
const PAIRS = {
  site: [
    ['--ink', ['--paper', '--card', '--tag'], AT_LEAST],
    ['--muted', ['--paper', '--card', '--tag'], AT_LEAST],
    // The focus ring is not text; it is held to the text minimum all the same.
    ['--accent', ['--paper', '--card', '--tag'], AT_LEAST],
    // The primary button writes in the page's colour on the ink.
    ['--paper', ['--ink'], AT_LEAST],
  ],
  article: [
    ['--ink', ['--paper', '--panel', '--green-wash', '--code-bg', '--tag'], AT_LEAST],
    ['--ink-soft', ['--paper', '--panel', '--green-wash', '--code-bg', '--tag'], AT_LEAST],
    ['--muted', ['--paper', '--panel', '--code-bg', '--tag'], AT_LEAST],
    // blog::US-003/AC-10: green text on the page and on the lead's green ground.
    ['--green', ['--paper', '--green-wash'], POST_ACCENT],
    ['--green-deep', ['--paper', '--green-wash'], POST_ACCENT],
    ['--green-deep', ['--panel', '--code-bg'], AT_LEAST],
  ],
};

for (const [name, css, selector, tokens] of [['site.css', siteCss, '.ap-site', site], ['article.css', articleCss, '.ap-article', article]]) {
  test(`${name} declares every colour token in the light appearance and again in the dark one`, () => {
    assert.ok(colourNames(tokens.light).length >= 8, `${name} declares ${colourNames(tokens.light).length} colour tokens, which is too few to be the palette`);
    assert.deepEqual(colourNames(tokens.dark), colourNames(tokens.light));
    // Only colours: the dark block does not restate sizes, fonts or any other property, which have no second value.
    assert.deepEqual([...tokens.dark.keys()].filter(token => !isColour(tokens.dark.get(token))), []);
    const others = darkRules(css).filter(({head}) => head === selector).flatMap(({body}) => [...declarations(body).keys()]).filter(property => !property.startsWith('--'));
    assert.deepEqual(others, []);
  });
}

for (const appearance of ['light', 'dark']) {
  test(`text keeps its contrast on every ground it is drawn on, in the ${appearance} appearance`, () => {
    const tokens = seen(appearance);
    const below = [];
    for (const [scope, pairs] of Object.entries(PAIRS)) {
      for (const [text, grounds, minimum] of pairs) {
        for (const ground of grounds) {
          const ratio = contrast(colourOf(tokens[scope], text), colourOf(tokens[scope], ground));
          if (ratio < minimum) below.push(`${scope}: ${text} on ${ground} is ${ratio.toFixed(2)}:1, under ${minimum}:1`);
        }
      }
    }
    assert.deepEqual(below, []);
  });
}

test('the contrast pairs name every token a shared stylesheet uses for text or for a ground', () => {
  const textTokens = new Set(Object.values(PAIRS).flatMap(pairs => pairs.map(([text]) => text)));
  const groundTokens = new Set(Object.values(PAIRS).flatMap(pairs => pairs.flatMap(([, grounds]) => grounds)));
  // Grounds that carry no text: the layer behind the larger view, the dog's floor and the screenshot's frame. The bar beside a heading is a ::before and is skipped below.
  const unlettered = new Set(['--scrim', '--floor', '--shot-ground']);
  const used = {text: new Set(), ground: new Set()};
  for (const css of [siteCss, articleCss]) {
    for (const {head, body} of flatRules(css)) {
      for (const [property, value] of declarations(body)) {
        const tokens = [...value.matchAll(/var\((--[\w-]+)\)/g)].map(match => match[1]);
        if (['color', 'fill'].includes(property)) tokens.forEach(token => used.text.add(token));
        if (['background', 'background-color'].includes(property) && !head.includes('::before')) tokens.forEach(token => used.ground.add(token));
      }
    }
  }
  assert.ok(used.text.size >= 5 && used.ground.size >= 5, `read ${used.text.size} text tokens and ${used.ground.size} grounds`);
  assert.deepEqual([...used.text].filter(token => !textTokens.has(token)), [], 'a token is used as text colour but has no contrast pair');
  assert.deepEqual([...used.ground].filter(token => !groundTokens.has(token) && !unlettered.has(token)), [], 'a token is used as a ground but no text is checked on it');
});

test('no colour is written in a shared stylesheet outside a token declaration, and a token holds its colour as #hex or rgb()', () => {
  const literal = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
  for (const [name, css] of [['site.css', siteCss], ['article.css', articleCss]]) {
    const outside = css.replace(/(?:^|[;{\s])--[\w-]+\s*:[^;}]*/g, '');
    assert.doesNotMatch(outside, literal, `${name} writes a colour outside a token: ${literal.exec(outside)?.[0]}`);
    // A colour written by name (white, black, Canvas) is as much a literal as one in hex, and a token written that way is a colour
    // the contrast cases above cannot read; both are caught here by reading every declaration of every rule.
    const byName = flatRules(css).flatMap(({head, body}) => [...declarations(body)].flatMap(([property, value]) => writtenColours(value).map(colour => `${head} { ${property}: ${colour} }`)));
    assert.deepEqual(byName, [], `${name} writes a colour by name or by a function other than rgb(), outside a token or inside one`);
  }
});

test('the screenshot ground is one colour in both appearances, and the dog keeps a floor shadow in each', () => {
  assert.equal(site.light.get('--shot-ground'), '#868892');
  assert.equal(site.dark.get('--shot-ground'), '#868892');
  assert.ok(site.light.has('--floor') && site.dark.has('--floor'));
});

test('a diagram sheet gives every colour token its light value in the dark appearance (site-appearance::REQ-002/AC-01)', () => {
  const pins = darkRules(articleCss).filter(({body}) => declarations(body).get('color-scheme') === 'light');
  assert.equal(pins.length, 1, 'one rule pins the diagram sheet');
  const pinned = declarations(pins[0].body);
  const light = seen('light').article;
  const everyToken = colourNames(new Map([...site.light, ...article.light]));
  const pinnedColours = [...pinned.keys()].filter(property => property.startsWith('--')).sort();
  assert.deepEqual(pinnedColours, everyToken);
  const pinnedTokens = new Map([...pinned].filter(([property]) => property.startsWith('--')));
  const wrong = everyToken.filter(token => resolve(`var(${token})`, pinnedTokens) !== resolve(`var(${token})`, light));
  assert.deepEqual(wrong, [], 'a pinned token is not its light value');
});
