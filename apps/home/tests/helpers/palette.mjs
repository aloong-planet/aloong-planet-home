// Reads the colour tokens that the homepage site's two shared stylesheets, site.css and article.css, declare in each appearance,
// and the arithmetic to hold them to a contrast. Shared by the palette test; the stylesheets are plain CSS, so this reads
// them with a small block reader instead of a CSS parser the package does not depend on.
import {readFile} from 'node:fs/promises';

const publicDir = new URL('../../public/', import.meta.url);

/** A shared stylesheet with its comments removed. */
export const readSheet = async name => (await readFile(new URL(name, publicDir), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');

/** The {head, body} rules at one level of a stylesheet; a nested block stays in its parent's body as written. */
export function rulesOf(css) {
  const rules = [];
  let at = 0;
  while (at < css.length) {
    const open = css.indexOf('{', at);
    if (open < 0) break;
    let depth = 1, end = open + 1;
    while (depth > 0 && end < css.length) { if (css[end] === '{') depth++; else if (css[end] === '}') depth--; end++; }
    rules.push({head: css.slice(at, open).trim(), body: css.slice(open + 1, end - 1)});
    at = end;
  }
  return rules;
}

/** The declarations of one rule body as property to value, in the order written, with whitespace collapsed. */
export function declarations(body) {
  const found = new Map();
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon > 0) found.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim().replace(/\s+/g, ' '));
  }
  return found;
}

/** Every rule that styles something, wherever it sits: the top level, or inside @media and @supports blocks of any depth, with the rule's own at-rule heads noted. */
export function flatRules(css, inside = []) {
  return rulesOf(css).flatMap(({head, body}) => (head.startsWith('@') ? flatRules(body, [...inside, head]) : [{head, body, inside}]));
}

const DARK_QUERY = /^@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)$/i;

/** The rules written directly inside the stylesheet's (prefers-color-scheme: dark) blocks. */
export function darkRules(css) {
  return rulesOf(css).filter(({head}) => DARK_QUERY.test(head)).flatMap(({body}) => rulesOf(body));
}

/** What every rule headed exactly `selector` declares: at the top level (light), and inside the dark blocks (dark). Custom properties only. */
export function tokensOf(css, selector) {
  const read = rules => new Map(rules.filter(({head}) => head === selector).flatMap(({body}) => [...declarations(body)]).filter(([name]) => name.startsWith('--')));
  return {light: read(rulesOf(css)), dark: read(darkRules(css))};
}

const COLOUR = /^(?:#[0-9a-f]{3,8}|rgba?\([^)]*\)|var\(--[\w-]+\))$/i;
/** Whether a custom property's value is a colour (or an alias of one), as opposed to a font stack or a length. */
export const isColour = value => COLOUR.test(value);

/** A value with every var(--name) alias followed through the given tokens. */
export function resolve(value, tokens) {
  for (let hops = 0; hops < 10; hops++) {
    const alias = /^var\((--[\w-]+)\)$/.exec(value);
    if (!alias) return value;
    if (!tokens.has(alias[1])) throw new Error(`${alias[1]} is used but not declared`);
    value = tokens.get(alias[1]);
  }
  throw new Error(`alias chain does not end: ${value}`);
}

/** {r, g, b, a} of a #rgb, #rrggbb, #rrggbbaa or rgb()/rgba() colour. */
export function parseColour(value) {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value);
  if (hex) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map(c => c + c).join('') : hex[1];
    const [r, g, b] = [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16));
    return {r, g, b, a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1};
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+)(%?))?\s*\)$/i.exec(value);
  if (fn) return {r: +fn[1], g: +fn[2], b: +fn[3], a: fn[4] === undefined ? 1 : fn[5] ? +fn[4] / 100 : +fn[4]};
  throw new Error(`not a colour this reader knows: ${value}`);
}

const channel = v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
/** WCAG relative luminance. */
export const luminance = ({r, g, b}) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
/** WCAG contrast ratio of two opaque colours. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
