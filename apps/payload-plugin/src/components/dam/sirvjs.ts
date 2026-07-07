/** Loads sirv.js (v3) once and starts it, for live spin / view / model previews. */

const SIRV_JS_URL = 'https://scripts.sirv.com/sirvjs/v3/sirv.js';

export function loadSirvJs(): void {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src="${SIRV_JS_URL}"]`)) return;
  const script = document.createElement('script');
  script.src = SIRV_JS_URL;
  script.async = true;
  document.head.appendChild(script);
}

/** Ask sirv.js to (re)scan the DOM for `.Sirv` containers. Safe to call before it has loaded. */
export function startSirv(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { Sirv?: { start?: () => void } };
  w.Sirv?.start?.();
}
