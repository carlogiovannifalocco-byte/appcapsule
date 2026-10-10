import { requestKey } from './shared.js';
import { mountDock, isDockDownload } from './dock.js';
import type { CapsuleData } from './types.js';

(() => {
  const element = document.getElementById('appcapsule-data');
  if (!element?.textContent) throw new Error('AppCapsule data is missing.');
  const data = JSON.parse(element.textContent) as CapsuleData;
  const initialHash = new URL(data.entryUrl).hash;
  if (!location.hash && initialHash) history.replaceState(null, '', initialHash);
  const fixtures = new Map(data.fixtures.map((f) => [f.key, f]));
  const state = {
    version: 1,
    hits: [] as string[],
    misses: [] as string[],
    fixtureCount: fixtures.size,
  };
  Object.defineProperty(window, '__APPCAPSULE__', { value: state, writable: false });

  const miss = (key: string) => {
    state.misses.push(key);

    window.dispatchEvent(new CustomEvent('appcapsule:miss', { detail: { key } }));
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    const signal = init?.signal ?? request?.signal;
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    const rawUrl = request?.url ?? String(input);
    const key = requestKey(
      method,
      rawUrl,
      data.entryUrl,
      location.protocol === 'file:' ? undefined : location.origin,
    );
    const fixture = fixtures.get(key);
    if (!fixture || !['GET', 'HEAD'].includes(method)) {
      miss(key);
      throw new TypeError(`AppCapsule: no recorded response for ${key}`);
    }
    state.hits.push(key);
    window.dispatchEvent(new CustomEvent('appcapsule:replay', { detail: { key } }));
    const body =
      method === 'HEAD' || [204, 205, 304].includes(fixture.status) ? null : fixture.body;
    const response = new Response(body, {
      status: fixture.status,
      headers: { 'content-type': fixture.contentType },
    });
    Object.defineProperty(response, 'url', { value: fixture.url });
    return response;
  };

  // Async text / JSON / blob / arraybuffer XHR covers common browser API clients.
  class CapsuleXHR extends EventTarget {
    static readonly UNSENT = 0;
    static readonly OPENED = 1;
    static readonly HEADERS_RECEIVED = 2;
    static readonly LOADING = 3;
    static readonly DONE = 4;
    readonly UNSENT = 0;
    readonly OPENED = 1;
    readonly HEADERS_RECEIVED = 2;
    readonly LOADING = 3;
    readonly DONE = 4;
    readyState = 0;
    status = 0;
    statusText = '';
    responseURL = '';
    responseType = '';
    response: unknown = null;
    responseText = '';
    responseXML = null;
    timeout = 0;
    withCredentials = false;
    upload = new EventTarget();
    onreadystatechange: ((event: Event) => void) | null = null;
    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onabort: ((event: Event) => void) | null = null;
    onloadend: ((event: Event) => void) | null = null;
    onloadstart: ((event: Event) => void) | null = null;
    onprogress: ((event: Event) => void) | null = null;
    ontimeout: ((event: Event) => void) | null = null;
    private method = 'GET';
    private url = '';
    private sent = false;
    private controller = new AbortController();
    private headers = new Headers();
    private emit(name: string) {
      const event = new Event(name);
      this.dispatchEvent(event);
      const handler = (this as any)[`on${name}`];
      if (typeof handler === 'function') handler.call(this, event);
    }
    private transition(value: number) {
      this.readyState = value;
      this.emit('readystatechange');
    }
    open(method: string, url: string | URL, async = true) {
      if (!async) {
        miss('Synchronous XMLHttpRequest');
        throw new Error('AppCapsule supports asynchronous XHR only.');
      }
      this.controller.abort();
      this.controller = new AbortController();
      this.method = method;
      this.url = String(url);
      this.sent = false;
      this.status = 0;
      this.response = null;
      this.responseText = '';
      this.headers = new Headers();
      this.transition(1);
    }
    setRequestHeader(_name: string, _value: string) {
      if (this.readyState !== 1 || this.sent)
        throw new DOMException('Invalid state', 'InvalidStateError');
      // Credentials and headers never leave the file and are not used to match data.
    }
    getResponseHeader(name: string) {
      return this.readyState >= 2 ? this.headers.get(name) : null;
    }
    getAllResponseHeaders() {
      return this.readyState >= 2
        ? [...this.headers].map(([k, v]) => `${k}: ${v}\r\n`).join('')
        : '';
    }
    overrideMimeType(_type: string) {}
    abort() {
      this.controller.abort();
      if (this.sent && this.readyState !== 4) {
        this.status = 0;
        this.transition(4);
        this.emit('abort');
        this.emit('loadend');
      }
      this.readyState = 0;
    }
    send() {
      if (this.readyState !== 1 || this.sent)
        throw new DOMException('Invalid state', 'InvalidStateError');
      this.sent = true;
      const controller = this.controller;
      this.emit('loadstart');
      void (async () => {
        try {
          const response = await fetch(this.url, {
            method: this.method,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          this.headers = response.headers;
          this.status = response.status;
          this.statusText = response.statusText;
          this.responseURL = response.url;
          this.transition(2);
          this.transition(3);
          const text = await response.text();
          if (controller.signal.aborted) return;
          this.responseText = text;
          if (this.responseType === 'json') {
            try {
              this.response = JSON.parse(text);
            } catch {
              this.response = null;
            }
          } else if (this.responseType === 'blob')
            this.response = new Blob([text], { type: response.headers.get('content-type') ?? '' });
          else if (this.responseType === 'arraybuffer')
            this.response = new TextEncoder().encode(text).buffer;
          else if (!this.responseType || this.responseType === 'text') this.response = text;
          else throw new Error(`Unsupported XHR responseType: ${this.responseType}`);
          this.emit('progress');
          this.transition(4);
          this.emit('load');
          this.emit('loadend');
        } catch {
          if (!controller.signal.aborted) {
            this.status = 0;
            this.transition(4);
            this.emit('error');
            this.emit('loadend');
          }
        }
      })();
    }
  }
  window.XMLHttpRequest = CapsuleXHR as unknown as typeof XMLHttpRequest;

  const unsupported = (name: string) =>
    class {
      constructor() {
        miss(name);
        throw new Error(`${name} is unavailable in an offline capsule.`);
      }
    };
  window.WebSocket = unsupported('WebSocket') as unknown as typeof WebSocket;
  window.EventSource = unsupported('EventSource') as unknown as typeof EventSource;
  window.Worker = unsupported('Worker') as unknown as typeof Worker;
  window.open = () => {
    miss('Popup navigation');
    return null;
  };
  navigator.sendBeacon = () => {
    miss('sendBeacon');
    return false;
  };
  document.addEventListener('securitypolicyviolation', (event) => {
    miss(`Blocked resource: ${event.violatedDirective} ${event.blockedURI}`);
  });
  document.addEventListener(
    'click',
    (event) => {
      const anchor = event.composedPath().find((node) => node instanceof HTMLAnchorElement) as
        HTMLAnchorElement | undefined;
      if (!anchor || isDockDownload(anchor)) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      event.preventDefault();
      miss('Navigation outside this capsule');
    },
    true,
  );
  document.addEventListener('submit', (event) => event.preventDefault(), true);

  const mount = () => mountDock(data, state);
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
