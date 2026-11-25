import {languageOf, ui} from './ui.js';

/** Register only after the browser has accepted the identity cookie.
 * @param {typeof fetch} fetcher
 * @param {AbortSignal} signal
 */
export async function getVisitorTotal(fetcher = fetch, signal = AbortSignal.timeout(5000)) {
  /** @type {RequestInit} */
  const options = {credentials:'same-origin',cache:'no-store',signal};
  const setup = await fetcher('/api/visitor',options);
  if (!setup.ok) throw new Error('Visitor setup unavailable');
  const response = await fetcher('/api/visitor',{...options,method:'POST'});
  if (!response.ok) throw new Error('Visitor registration unavailable');
  const data = await response.json();
  if (!Number.isSafeInteger(data.total) || data.total < 1) throw new Error('Invalid visitor total');
  return data.total;
}

/** @param {typeof fetch} fetcher @param {AbortSignal} signal */
export async function readVisitorTotal(fetcher = fetch, signal = AbortSignal.timeout(5000)) {
  const response = await fetcher('/api/visitor?total=1',{credentials:'same-origin',cache:'no-store',signal});
  if (!response.ok) throw new Error('Visitor total unavailable');
  const data = await response.json();
  if (!Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid visitor total');
  return data.total;
}

/** Register every counted page; only the homepage owns a live display. The line is worded in the page's document language
 * (visitor-counter::REQ-001/AC-02), and its number is written in `locale`, which is the browser's own number format when left out,
 * whatever the page's language.
 * @param {{page?: Document, lifecycle?: Window, browser?: Navigator, fetcher?: typeof fetch, locale?: string}} options
 */
export function startVisitorCounter({page = document, lifecycle = window, browser = navigator, fetcher = fetch, locale} = {}) {
  const element = page.querySelector('[data-visitor-counter]');
  const {line} = ui[languageOf(page.documentElement.lang)].visitor;
  let registered = false;
  let suspended = false;
  let stopped = false;
  let refreshPending = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @type {AbortController | undefined} */
  let active;
  const visible = () => !stopped && !suspended && page.visibilityState !== 'hidden';
  function clearTimer() {
    clearTimeout(timer);
    timer = undefined;
  }
  async function refresh() {
    clearTimer();
    if (stopped || suspended) return;
    if (active) { refreshPending = true; return; }
    const controller = new AbortController();
    active = controller;
    const signal = AbortSignal.any([controller.signal,AbortSignal.timeout(5000)]);
    try {
      let total;
      if (!registered) {
        const register = () => getVisitorTotal(fetcher,signal);
        total = browser.locks
          ? await browser.locks.request('aloong-visitor-bootstrap',{signal},register)
          : await register();
        signal.throwIfAborted();
        registered = true;
      } else {
        total = await readVisitorTotal(fetcher,signal);
        signal.throwIfAborted();
      }
      if (element && visible()) element.textContent = line(total, total.toLocaleString(locale));
    } catch {
      if (element && !stopped) element.textContent = '';
    } finally {
      active = undefined;
      if (visible()) {
        if (refreshPending) {
          refreshPending = false;
          void refresh();
        } else if (element) timer = setTimeout(() => void refresh(),30000);
      }
    }
  }
  function pause() {
    clearTimer();
    refreshPending = false;
    active?.abort();
  }
  function onVisibility() {
    if (!visible()) pause();
    else if (element || !registered) void refresh();
  }
  function onHide() { suspended = true; pause(); }
  /** @param {PageTransitionEvent} event */
  function onShow(event) {
    if (!event.persisted) return;
    suspended = false;
    if ((element || !registered) && visible()) void refresh();
  }
  page.addEventListener('visibilitychange',onVisibility);
  lifecycle.addEventListener('pagehide',onHide);
  lifecycle.addEventListener('pageshow',onShow);
  void refresh();
  return () => {
    stopped = true;
    pause();
    page.removeEventListener('visibilitychange',onVisibility);
    lifecycle.removeEventListener('pagehide',onHide);
    lifecycle.removeEventListener('pageshow',onShow);
  };
}

if (typeof document !== 'undefined') startVisitorCounter();
