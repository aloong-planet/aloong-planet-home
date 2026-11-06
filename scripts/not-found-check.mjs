/** The heading of the given not-found page markup, by which a response is recognized as that page. */
export function notFoundHeading(html) {
  const heading = html.match(/<h1\b[^>]*>([^<]+)<\/h1>/)?.[1];
  if (!heading) throw new Error('The not-found page has no heading to recognize it by.');
  return heading;
}

/** Whether the answer to an address the site does not have is the not-found page: status 404 and the page's heading. */
export const isNotFoundAnswer = (status, body, heading) => status === 404 && body.includes(heading);
