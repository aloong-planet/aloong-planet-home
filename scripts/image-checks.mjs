/** The address of every image the given homepage markup shows, in document order. */
export const homepageImages = html => [...html.matchAll(/<img\b[^>]*?\ssrc="([^"]+)"/g)].map(match => match[1]);
