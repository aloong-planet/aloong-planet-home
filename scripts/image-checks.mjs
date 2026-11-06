/** The address of every image the given homepage markup shows, in document order. */
export const homepageImages = html => [...html.matchAll(/<img\b[^>]*?\ssrc="([^"]+)"/g)].map(match => match[1]);

/** The sprite settings the given dog script declares, and the folder it loads its sheets from. */
export function dogSprites(script) {
  const base = script.match(/^const base='([^']+)';$/m)?.[1];
  const config = script.match(/^const goldenConfig = (\{.*\});$/m)?.[1];
  if (!base || !config) throw new Error('This is not the dog script: it declares no sprite settings.');
  return {base, config: JSON.parse(config)};
}

/** The address of every motion sheet the given dog script loads, resolved against the homepage as the browser does. */
export function motionSheets(script) {
  const {base, config} = dogSprites(script);
  return config.sheets.map(sheet => new URL(base + sheet.file, 'https://homepage.invalid/').pathname);
}
