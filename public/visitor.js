/** Obtain an ordinal only after the browser has accepted the identity cookie.
 * @param {typeof fetch} fetcher
 * @param {AbortSignal} signal
 */
export async function getVisitorOrdinal(fetcher = fetch, signal = AbortSignal.timeout(5000)) {
  /** @type {RequestInit} */
  const options = {credentials:'same-origin',cache:'no-store',signal};
  const setup = await fetcher('/api/visitor',options);
  if (!setup.ok) throw new Error('Visitor setup unavailable');
  const response = await fetcher('/api/visitor',{...options,method:'POST'});
  if (!response.ok) throw new Error('Visitor registration unavailable');
  const data = await response.json();
  if (!Number.isSafeInteger(data.ordinal) || data.ordinal < 1) throw new Error('Invalid visitor ordinal');
  return data.ordinal;
}

/** @param {Element} element @param {Navigator} browser */
export async function displayVisitor(element, browser = navigator) {
  try {
    const signal = AbortSignal.timeout(5000);
    const register = () => getVisitorOrdinal(fetch,signal);
    // Serializes the cookie bootstrap when first-ever visits open in several tabs.
    const ordinal = browser.locks
      ? await browser.locks.request('aloong-visitor-bootstrap',{signal},register)
      : await register();
    element.textContent = `你好朋友，你是第 ${ordinal.toLocaleString('zh-CN')} 位访客`;
  } catch {
    element.textContent = '';
  }
}

if (typeof document !== 'undefined') {
  const element = document.querySelector('[data-visitor-counter]');
  if (element) void displayVisitor(element);
}
