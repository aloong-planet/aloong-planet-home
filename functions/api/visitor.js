const COOKIE_NAME = 'aloong_visitor';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** @param {Request} request */
function identifier(request) {
  const matches = (request.headers.get('cookie') || '').split(';')
    .map(value => value.trim()).filter(value => value.startsWith(`${COOKIE_NAME}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(COOKIE_NAME.length + 1);
  return UUID.test(value) ? value : null;
}

/** @param {unknown} body @param {number} status @param {Record<string,string>} extra */
function json(body, status=200, extra={}) {
  return new Response(JSON.stringify(body), {status,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'private, no-store',
    'Vary':'Cookie, Origin',
    'X-Content-Type-Options':'nosniff',
    ...extra
  }});
}

/** @type {PagesFunction<{VISITORS: D1Database}>} */
export const onRequest = async ({request,env}) => {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  // The endpoint is private to its own page; never issue permissive CORS headers.
  if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({error:'forbidden'},403);
  }
  if (!['GET','POST'].includes(request.method)) return json({error:'method_not_allowed'},405,{'Allow':'GET, POST'});
  const id = identifier(request);
  if (request.method === 'GET') {
    if (id) return json({ready:true});
    const domain = ['aloongplanet.com','www.aloongplanet.com'].includes(url.hostname)
      ? '; Domain=aloongplanet.com' : '';
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    return json({ready:true},200,{
      'Set-Cookie':`${COOKIE_NAME}=${crypto.randomUUID()}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}${domain}`
    });
  }
  // A cookie roundtrip is required: blocked cookies must not count every refresh.
  if (!id) return json({error:'cookie_required'},428);
  try {
    const results = await env.VISITORS.batch([
      env.VISITORS.prepare(`INSERT INTO visitors (visitor_id)
        SELECT ? WHERE NOT EXISTS (SELECT 1 FROM visitors WHERE visitor_id = ?)`).bind(id,id),
      env.VISITORS.prepare('SELECT ordinal FROM visitors WHERE visitor_id = ?').bind(id)
    ]);
    const row = /** @type {{ordinal?: unknown} | undefined} */ (results[1].results[0]);
    const ordinal = row?.ordinal;
    if (typeof ordinal !== 'number' || !Number.isSafeInteger(ordinal) || ordinal < 1) {
      throw new Error('Invalid ordinal');
    }
    return json({ordinal});
  } catch {
    // Keep the cookie stable so a retry after a partial network failure reuses identity.
    return json({error:'temporarily_unavailable'},503);
  }
};
