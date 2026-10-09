import { requestKey } from './shared.js';
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
  let announce = (_message: string) => {};
  const miss = (key: string) => {
    state.misses.push(key);
    announce('This action is outside the recorded demo.');
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
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      event.preventDefault();
      miss('Navigation outside this capsule');
    },
    true,
  );
  document.addEventListener('submit', (event) => event.preventDefault(), true);

  const mount = () => {
    const host = document.createElement('appcapsule-dock');
    host.style.cssText =
      'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;max-width:calc(100vw - 24px);';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
      :host{all:initial;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;color:#eaf2ee;font-size:13px;line-height:1.5;color-scheme:dark}
      *{box-sizing:border-box}button{font:inherit;cursor:pointer}button:focus-visible{outline:2px solid #96f7c0;outline-offset:4px}
      .dock{display:flex;align-items:center;gap:15px;padding:10px 12px 10px 16px;background:#14251feb;border:1px solid #ffffff24;border-radius:16px;box-shadow:0 8px 35px #0a201d25;backdrop-filter:blur(16px);white-space:nowrap}
      .brand{display:flex;align-items:center;gap:9px;font-weight:750;letter-spacing:-.3px}.mark{width:21px;height:13px;border:2px solid #9ce6b6;border-radius:12px;transform:rotate(-35deg);position:relative}.mark:after{content:'';position:absolute;left:8px;top:-1px;width:1px;height:11px;background:#9ce6b6}
      .status{color:#b4c8bb;font-size:12px;border-left:1px solid #ffffff24;padding-left:15px}.dot{display:inline-block;width:6px;height:6px;background:#a4edba;border-radius:50%;margin-right:6px}
      .details{background:#ffffff0c;color:#e3eee8;border:1px solid #ffffff17;border-radius:9px;padding:6px 10px}.details:hover{background:#ffffff19}
      .panel{position:absolute;bottom:65px;left:50%;transform:translateX(-50%);width:360px;max-width:calc(100vw - 24px);padding:22px;background:#14251f;border:1px solid #ffffff20;border-radius:18px;box-shadow:0 14px 60px #001a1936}
      [hidden]{display:none!important}h2{margin:0 0 6px;font-size:17px;letter-spacing:-.4px}p{margin:0 0 15px;color:#b4c8bb;font-size:13px;white-space:normal}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.metric{border:1px solid #ffffff15;border-radius:10px;padding:12px}.metric b{display:block;color:#a4edba;font-size:23px}.metric span{color:#b4c8bb;font-size:11px}
      .note{padding:11px;background:#ffffff08;border-radius:9px;font-size:12px}.close{float:right;background:none;border:0;color:#b4c8bb;font-size:19px;padding:0 3px}.toast{position:absolute;bottom:66px;left:50%;transform:translateX(-50%);padding:12px 17px;border-radius:12px;background:#402c1b;color:#ffe2b6;box-shadow:0 6px 30px #0002;width:max-content;max-width:calc(100vw - 24px);font-size:13px}
      @media(max-width:420px){.status{display:none}.dock{gap:12px}.panel{bottom:60px}}
      @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
    </style>
    <section class="panel" id="details-panel" hidden aria-label="About this capsule">
      <button class="close" aria-label="Close capsule details">×</button><h2>Your app. In a capsule.</h2>
      <p id="capsule-title"></p><div class="grid"><div class="metric"><b id="captured"></b><span>captured responses</span></div><div class="metric"><b id="replayed">0</b><span>requests replayed locally</span></div></div>
      <p class="note">This demo runs from captured data. Unsupported actions are blocked and identified. No live backend is connected.</p>
      <p style="margin-bottom:0;font-size:11px" id="date"></p>
    </section>
    <div class="toast" role="status" aria-live="polite" hidden></div>
    <div class="dock"><span class="brand"><span class="mark" aria-hidden="true"></span>AppCapsule</span><span class="status"><span class="dot"></span>Offline demo</span><button class="details" aria-controls="details-panel" aria-expanded="false">Inside the capsule ↗</button></div>`;
    shadow.getElementById('capsule-title')!.textContent = data.title;
    shadow.getElementById('captured')!.textContent = String(fixtures.size);
    shadow.getElementById('date')!.textContent =
      `Captured ${new Date(data.createdAt).toLocaleDateString()} · AppCapsule 0.1`;
    const panel = shadow.querySelector<HTMLElement>('.panel')!,
      details = shadow.querySelector<HTMLButtonElement>('.details')!;
    const toast = shadow.querySelector<HTMLElement>('.toast')!;
    const close = () => {
      panel.hidden = true;
      details.setAttribute('aria-expanded', 'false');
      details.focus();
    };
    details.onclick = () => {
      panel.hidden = !panel.hidden;
      toast.hidden = true;
      details.setAttribute('aria-expanded', String(!panel.hidden));
      shadow.getElementById('replayed')!.textContent = String(state.hits.length);
    };
    shadow.querySelector<HTMLButtonElement>('.close')!.onclick = close;
    shadow.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Escape' && !panel.hidden) close();
    });
    window.addEventListener('appcapsule:replay', () => {
      shadow.getElementById('replayed')!.textContent = String(state.hits.length);
    });
    let timer: ReturnType<typeof setTimeout>;
    announce = (message) => {
      panel.hidden = true;
      details.setAttribute('aria-expanded', 'false');
      toast.textContent = message;
      toast.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        toast.hidden = true;
      }, 5000);
    };
    document.body.append(host);
  };
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
