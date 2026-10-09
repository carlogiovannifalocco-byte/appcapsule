/** URL matching is exact except for query ordering and URL fragments. */
export function requestKey(
  method: string,
  input: string,
  base: string,
  currentOrigin?: string,
): string {
  const url = new URL(input, base);
  const original = new URL(base);
  if (currentOrigin && url.origin === currentOrigin) {
    url.protocol = original.protocol;
    url.host = original.host;
  }
  url.hash = '';
  url.searchParams.sort();
  return `${method.toUpperCase()} ${url.href}`;
}

export function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
