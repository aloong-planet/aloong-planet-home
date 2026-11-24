// Which requests decide how wide a page is. A stylesheet, a font, an image or a video that does not arrive changes
// the layout: the fallback font is another width, a missing image has another size.
const LAYOUT_TYPES = new Set(['stylesheet', 'font', 'image', 'media'])

export const affectsLayout = (resourceType) => LAYOUT_TYPES.has(resourceType)
