import type { CapsuleData } from './types.js';

const downloads = new WeakSet<HTMLAnchorElement>();
export const isDockDownload = (anchor: HTMLAnchorElement) => downloads.has(anchor);
type Session = { hits: string[]; misses: string[]; fixtureCount: number };

export function mountDock(data: CapsuleData, state: Session) {
  const host = document.createElement('appcapsule-dock');
  host.style.cssText =
    'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2147483647;max-width:calc(100vw - 24px);';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host{all:initial;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;color:#edf3ed;font-size:13px;line-height:1.5;color-scheme:dark}
    *{box-sizing:border-box}button,input,select{font:inherit;color:inherit}button{cursor:pointer;transition:background .18s,transform .18s,border-color .18s}button:active{transform:translateY(1px)}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid #c8f1a1;outline-offset:3px}[hidden]{display:none!important}
    .dock{display:flex;align-items:center;gap:14px;padding:9px 10px 9px 15px;background:#182820f5;border:1px solid #ffffff24;border-radius:15px;box-shadow:0 7px 30px #0d261a25;backdrop-filter:blur(18px);white-space:nowrap}
    .brand{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:700;letter-spacing:-.3px}.mark{width:21px;height:13px;border:2px solid #c5eaa2;border-radius:12px;transform:rotate(-35deg);position:relative;flex:none}.mark:after{content:'';position:absolute;left:8px;top:-1px;width:1px;height:11px;background:#c5eaa2}.status{font-size:10px;color:#c0cfbd;border-left:1px solid #ffffff20;padding-left:14px}.dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:#c5eaa2;margin-right:6px}.details{border:1px solid #ffffff19;background:#ffffff0b;border-radius:9px;padding:8px 10px;font-size:10px}.details:hover{background:#ffffff18}.compact{display:grid;place-items:center;width:28px;height:30px;border:0;background:transparent;color:#bdcdb9;border-radius:7px;font-size:16px}.compact:hover{background:#ffffff12}
    .panel{position:absolute;bottom:66px;left:50%;transform:translateX(-50%);width:460px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 100px);overflow:auto;overscroll-behavior:contain;background:#17271f;border:1px solid #ffffff25;border-radius:18px;box-shadow:0 24px 80px #001b1645;padding:22px}.panel:not([hidden]){animation:appear .2s ease}.heading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.eyebrow{font-size:8px;letter-spacing:1.8px;color:#c5eaa2;margin:0 0 10px}h2{font-size:18px;line-height:1.4;letter-spacing:-.5px;margin:0 0 6px;font-weight:600}p{font-size:12px;color:#bbcbb6;margin:0;line-height:1.7;overflow-wrap:anywhere}.close{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;border:1px solid #ffffff20;background:#ffffff05;color:#c6d4c2;font-size:19px;flex:none}.segments{display:flex;gap:4px;padding:4px;border:1px solid #ffffff16;background:#ffffff04;border-radius:9px;margin:20px 0 17px}.segments button{flex:1;padding:7px;border:0;border-radius:6px;background:none;color:#b8c9b2;font-size:11px}.segments button[aria-pressed=true]{background:#344737;color:#edf5e7}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 15px}.metric{padding:14px 10px;border:1px solid #ffffff17;border-radius:11px;background:#ffffff03}.metric b{display:block;font-size:27px;letter-spacing:-1px;font-weight:500;color:#c5eaa2;line-height:1.2}.metric span{display:block;margin-top:8px;font-size:9px;color:#b9cbb2}.metric.warning b{color:#ffce9f}.coverage{border:1px solid #ffffff15;border-radius:10px;padding:13px;margin-bottom:14px}.coverage>div:first-child{display:flex;justify-content:space-between;gap:12px;font-size:10px;color:#bbccb5}.coverage strong{color:#e4efde;font-weight:500}.track{height:4px;border-radius:5px;background:#ffffff12;overflow:hidden;margin:11px 0 8px}.track i{display:block;height:100%;border-radius:5px;background:#c5eaa2;transition:width .3s}.fine{font-size:9px;line-height:1.6;color:#aebeaa}.note{padding:12px;background:#ffffff05;border-radius:9px;font-size:11px}.meta{display:flex;justify-content:space-between;gap:10px;font-size:9px;color:#b8c9b2;margin:15px 0}.actions{display:flex;gap:8px;margin-top:18px}.actions button,.confirm button{flex:1;padding:10px 9px;background:#ffffff08;color:#e3efde;border:1px solid #ffffff20;border-radius:8px;font-size:10px}.actions button:hover,.confirm button:hover{background:#ffffff14}.actions .primary{background:#c5eaa2;color:#1c3019;border-color:#c5eaa2;font-weight:600}.confirm{margin-top:12px;padding:12px;background:#ffffff07;border-radius:10px}.confirm p{font-size:11px;margin-bottom:10px}.confirm>div{display:flex;gap:8px}.footer{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #ffffff15;padding-top:13px;margin-top:17px;font-size:8px;color:#b3c5ac}.footer kbd{font:8px ui-monospace,monospace;border:1px solid #ffffff20;border-radius:4px;padding:2px 4px}
    .search-row{display:flex;gap:8px;margin-bottom:10px}.search-row input{min-width:0;flex:1;background:#ffffff05;border:1px solid #ffffff20;border-radius:8px;padding:10px;font-size:11px}.search-row input::placeholder{color:#aebfa7}.search-row select{max-width:120px;padding:7px;background:#21352a;border:1px solid #ffffff20;border-radius:8px;font-size:10px}.request-count{margin:0 0 10px;font-size:9px;color:#b9cbb2}.request-list{max-height:260px;overflow:auto;overscroll-behavior:contain;padding:2px}.request{border:1px solid #ffffff18;border-radius:9px;margin-bottom:7px;overflow:hidden}.request summary{list-style:none;display:flex;align-items:center;gap:8px;padding:11px 10px;cursor:pointer;background:#ffffff03}.request summary::-webkit-details-marker{display:none}.method{font:9px ui-monospace,monospace;color:#c5eaa2;flex:none}.request code{font:10px ui-monospace,monospace;color:#dce8d6;overflow-wrap:anywhere;min-width:0;flex:1}.response-status{font:9px ui-monospace,monospace;color:#b8c9b2;flex:none}.usage{font-size:8px;color:#c5eaa2;background:#c5eaa212;border-radius:4px;padding:2px 4px;flex:none}.usage.unused{background:#ffffff08;color:#b8c9b2}.request summary:after{content:'+';color:#b8c9b2}.request[open] summary:after{content:'−'}.request-body{padding:10px;border-top:1px solid #ffffff12}.request-body p{font:9px ui-monospace,monospace;color:#b3c5ac;margin-bottom:8px;word-break:break-all}.request pre{white-space:pre-wrap;overflow-wrap:anywhere;font:10px/1.65 ui-monospace,monospace;max-height:180px;overflow:auto;margin:0;color:#dce8d6}.request-body small{display:block;margin-top:8px;font-size:9px;color:#c7d6c1}.empty{border:1px dashed #ffffff25;border-radius:10px;padding:24px 15px;font-size:11px;color:#bbccb5;text-align:center}.blocked{border:1px solid #795435;border-radius:9px;padding:10px;background:#3c2c1c;color:#ffdbb5;font:10px/1.7 ui-monospace,monospace;overflow-wrap:anywhere;margin-bottom:7px}.toast{position:absolute;bottom:66px;left:50%;transform:translateX(-50%);padding:12px 16px;border:1px solid #876447;border-radius:12px;background:#3c2c1c;color:#ffe2bd;box-shadow:0 6px 30px #0002;width:max-content;max-width:calc(100vw - 24px);font-size:12px;animation:appear .2s ease}:host(.collapsed) .status,:host(.collapsed) .details,:host(.collapsed) .brand-label{display:none}:host(.collapsed) .dock{padding:8px 9px;gap:8px}:host(.collapsed) .brand{cursor:pointer}:host(.activity) .dot{animation:pulse .35s ease}
    @keyframes appear{from{opacity:0;margin-bottom:-6px}to{opacity:1;margin-bottom:0}}@keyframes pulse{50%{box-shadow:0 0 0 4px #c5eaa225}}
    @media(max-width:480px){.status{display:none}.dock{gap:10px}.panel{padding:18px;width:400px}.metric{padding:12px 9px}.metric span{font-size:9px}.search-row input,.search-row select{font-size:16px}.search-row select{max-width:135px}.actions button{font-size:10px}.request-list{max-height:230px}.footer kbd{display:none}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
  </style>
  <section class="panel" id="details-panel" hidden aria-label="About this capsule">
    <div class="heading"><div><div class="eyebrow">PORTABLE BY DESIGN</div><h2>Your app. In a capsule.</h2><p id="capsule-title"></p></div><button class="close" aria-label="Close capsule details">×</button></div>
    <div class="segments" role="group" aria-label="Capsule view"><button data-view="overview" aria-pressed="true">Overview</button><button data-view="requests" aria-pressed="false">Requests</button></div>
    <div id="overview"><div class="grid"><div class="metric"><b id="captured"></b><span>captured responses</span></div><div class="metric"><b id="replayed">0</b><span>local replays</span></div><div class="metric" id="blocked-metric"><b id="blocked">0</b><span>blocked actions</span></div></div><div class="coverage"><div><span>Responses used this session</span><strong id="used-label"></strong></div><div class="track"><i id="used-bar"></i></div><p class="fine">Session activity, not an offline verification result.</p></div><p class="note">Explore the app with captured data. Your interactions stay in this file; no live backend is connected.</p><div class="meta"><span id="date"></span><span id="size"></span></div></div>
    <div id="requests" hidden><div class="search-row"><input id="request-search" type="search" aria-label="Search captured requests" placeholder="Find an endpoint…"><select id="request-filter" aria-label="Filter requests"><option value="all">All responses</option><option value="used">Replayed</option><option value="unused">Not used yet</option><option value="blocked">Blocked</option></select></div><p class="request-count" id="request-count" aria-live="polite"></p><div class="request-list" id="request-list"></div><p class="fine">Expand a response to inspect its recorded content.</p></div>
    <div class="actions"><button class="primary" id="download-report">Download session report</button><button id="restart">Restart demo ↻</button></div><div class="confirm" hidden><p>This reloads the demo at its recorded starting screen. Unsaved changes may be lost.</p><div><button id="restart-now">Restart now</button><button id="restart-cancel">Keep exploring</button></div></div><div class="footer"><span id="generator"></span><span><kbd>Alt + Shift + C</kbd> capsule controls</span></div>
  </section>
  <div class="toast" role="status" aria-live="polite" hidden></div>
  <div class="dock"><span class="brand"><span class="mark" aria-hidden="true"></span><span class="brand-label">AppCapsule</span></span><span class="status"><span class="dot"></span>Offline demo</span><button class="details" aria-controls="details-panel" aria-expanded="false">Inside the capsule ↗</button><button class="compact" aria-label="Minimize capsule controls" title="Minimize controls">−</button></div>`;
  const get = <T extends HTMLElement = HTMLElement>(id: string) => shadow.getElementById(id) as T;
  const panel = get('details-panel'),
    trigger = shadow.querySelector<HTMLButtonElement>('.details')!;
  const compact = shadow.querySelector<HTMLButtonElement>('.compact')!;
  const toast = shadow.querySelector<HTMLElement>('.toast')!,
    confirm = shadow.querySelector<HTMLElement>('.confirm')!;
  const encoder = new TextEncoder();
  const byteSizes = new Map(
    data.fixtures.map((fixture) => [fixture.key, encoder.encode(fixture.body).length]),
  );
  const prettySize = (bytes: number) =>
    bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  const hitCounts = new Map<string, number>();
  for (const key of state.hits) hitCounts.set(key, (hitCounts.get(key) || 0) + 1);
  get('capsule-title').textContent = data.title;
  get('captured').textContent = String(data.fixtures.length);
  get('date').textContent = `Captured ${new Date(data.createdAt).toLocaleDateString()}`;
  get('size').textContent =
    `${prettySize([...byteSizes.values()].reduce((a, b) => a + b, 0))} recorded data`;
  get('generator').textContent = data.generator.replace('/', ' ');
  let view = 'overview',
    minimized = false;
  const requestSearch = get<HTMLInputElement>('request-search'),
    requestFilter = get<HTMLSelectElement>('request-filter');
  const renderRequests = () => {
    const list = get('request-list');
    const scrollTop = list.scrollTop;
    const focusedKey = shadow.activeElement?.closest('details')?.dataset.key;
    const expanded = new Set(
      [...list.querySelectorAll<HTMLDetailsElement>('details[open]')].map(
        (node) => node.dataset.key,
      ),
    );
    const query = requestSearch.value.trim().toLowerCase();
    const mode = requestFilter.value;
    list.replaceChildren();
    let count = 0;
    if (mode === 'blocked') {
      for (const key of new Set(state.misses)) {
        if (!key.toLowerCase().includes(query)) continue;
        const item = document.createElement('div');
        item.className = 'blocked';
        item.textContent = key;
        list.append(item);
        count++;
      }
    } else
      for (const fixture of data.fixtures) {
        const hits = hitCounts.get(fixture.key) || 0;
        if (
          (mode === 'used' && !hits) ||
          (mode === 'unused' && hits) ||
          !`${fixture.method} ${fixture.url} ${fixture.status} ${fixture.contentType}`
            .toLowerCase()
            .includes(query)
        )
          continue;
        const item = document.createElement('details');
        item.className = 'request';
        item.dataset.key = fixture.key;
        item.innerHTML =
          '<summary><span class="method"></span><code></code><span class="response-status"></span><span class="usage"></span></summary><div class="request-body"></div>';
        item.querySelector('.method')!.textContent = fixture.method;
        let endpoint = fixture.url;
        try {
          const parsed = new URL(fixture.url);
          endpoint = parsed.pathname + parsed.search;
        } catch {}
        item.querySelector('code')!.textContent = endpoint;
        item.querySelector('.response-status')!.textContent = String(fixture.status);
        const usage = item.querySelector<HTMLElement>('.usage')!;
        usage.textContent = hits ? `${hits}×` : 'unused';
        usage.classList.toggle('unused', !hits);
        const fill = () => {
          const body = item.querySelector<HTMLElement>('.request-body')!;
          if (body.childNodes.length) return;
          const meta = document.createElement('p');
          meta.textContent = `${fixture.url}\n${fixture.contentType} · ${prettySize(byteSizes.get(fixture.key) || 0)}`;
          const preview = document.createElement('pre');
          let text = fixture.body;
          if (text.length <= 16000 && fixture.contentType.includes('json'))
            try {
              text = JSON.stringify(JSON.parse(text), null, 2);
            } catch {}
          preview.textContent = text.slice(0, 16000) || '(empty response)';
          body.append(meta, preview);
          if (text.length > 16000) {
            const note = document.createElement('small');
            note.textContent =
              'Preview limited to 16,000 characters. The full response remains in the capsule.';
            body.append(note);
          }
        };
        item.addEventListener('toggle', () => {
          if (item.open) fill();
        });
        if (expanded.has(fixture.key)) {
          item.open = true;
          fill();
        }
        list.append(item);
        count++;
      }
    get('request-count').textContent =
      `${count} ${mode === 'blocked' ? 'distinct blocked actions' : 'responses'} shown`;
    if (!count) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent =
        mode === 'blocked'
          ? 'No matching blocked actions. Keep exploring.'
          : 'No matching responses. Try another search or filter.';
      list.append(empty);
    }
    if (focusedKey) {
      const replacement = [...list.querySelectorAll<HTMLDetailsElement>('details')].find(
        (node) => node.dataset.key === focusedKey,
      );
      (replacement?.querySelector('summary') || requestFilter).focus({ preventScroll: true });
    }
    list.scrollTop = scrollTop;
  };
  const update = () => {
    get('replayed').textContent = String(state.hits.length);
    get('blocked').textContent = String(state.misses.length);
    get('blocked-metric').classList.toggle('warning', state.misses.length > 0);
    get('used-label').textContent = `${hitCounts.size} / ${data.fixtures.length}`;
    get('used-bar').style.width =
      `${data.fixtures.length ? (hitCounts.size / data.fixtures.length) * 100 : 0}%`;
    if (!panel.hidden && view === 'requests') renderRequests();
  };
  const close = () => {
    panel.hidden = true;
    confirm.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    (minimized ? compact : trigger).focus();
  };
  const setMinimized = (value: boolean) => {
    minimized = value;
    host.classList.toggle('collapsed', value);
    compact.setAttribute(
      'aria-label',
      value ? 'Restore capsule controls' : 'Minimize capsule controls',
    );
    compact.title = value ? 'Restore controls' : 'Minimize controls';
    compact.textContent = value ? '+' : '−';
  };
  const toggle = () => {
    setMinimized(false);
    panel.hidden = !panel.hidden;
    toast.hidden = true;
    trigger.setAttribute('aria-expanded', String(!panel.hidden));
    update();
    if (!panel.hidden) shadow.querySelector<HTMLButtonElement>('.close')!.focus();
    else trigger.focus();
  };
  trigger.onclick = toggle;
  compact.onclick = () => {
    if (!panel.hidden) close();
    setMinimized(!minimized);
    compact.focus();
  };
  shadow.querySelector<HTMLButtonElement>('.close')!.onclick = close;
  shadow.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      close();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (
      event.altKey &&
      event.shiftKey &&
      event.code === 'KeyC' &&
      !document.querySelector('dialog[open]')
    ) {
      event.preventDefault();
      toggle();
    }
  });
  for (const button of shadow.querySelectorAll<HTMLButtonElement>('[data-view]'))
    button.onclick = () => {
      view = button.dataset.view!;
      get('overview').hidden = view !== 'overview';
      get('requests').hidden = view !== 'requests';
      for (const tab of shadow.querySelectorAll<HTMLButtonElement>('[data-view]'))
        tab.setAttribute('aria-pressed', String(tab === button));
      if (view === 'requests') renderRequests();
    };
  requestSearch.oninput = renderRequests;
  requestFilter.onchange = renderRequests;
  get('restart').onclick = () => {
    confirm.hidden = !confirm.hidden;
    if (!confirm.hidden) get('restart-cancel').focus();
  };
  get('restart-cancel').onclick = () => {
    confirm.hidden = true;
    get('restart').focus();
  };
  get('restart-now').onclick = () => {
    location.hash = new URL(data.entryUrl).hash;
    location.reload();
  };
  get('download-report').onclick = () => {
    const report = {
      schemaVersion: 1,
      kind: 'appcapsule-session',
      title: data.title,
      generator: data.generator,
      capturedAt: data.createdAt,
      exportedAt: new Date().toISOString(),
      recordedResponses: data.fixtures.length,
      redactedFields: data.redactions,
      replayCount: state.hits.length,
      usedResponses: hitCounts.size,
      blockedActions: [...state.misses],
      responses: data.fixtures.map((fixture) => ({
        method: fixture.method,
        url: fixture.url,
        status: fixture.status,
        contentType: fixture.contentType,
        bytes: byteSizes.get(fixture.key),
        replays: hitCounts.get(fixture.key) || 0,
      })),
      note: 'Session diagnostics only. This is not an offline verification report. Response bodies are excluded.',
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'appcapsule-session.json';
    downloads.add(anchor);
    shadow.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  let timer: ReturnType<typeof setTimeout>, pulse: ReturnType<typeof setTimeout>;
  window.addEventListener('appcapsule:replay', (event) => {
    const key = (event as CustomEvent<{ key: string }>).detail.key;
    hitCounts.set(key, (hitCounts.get(key) || 0) + 1);
    update();
    host.classList.add('activity');
    clearTimeout(pulse);
    pulse = setTimeout(() => host.classList.remove('activity'), 400);
  });
  window.addEventListener('appcapsule:miss', () => {
    update();
    toast.textContent = 'This action is outside the recorded demo.';
    toast.hidden = !panel.hidden;
    clearTimeout(timer);
    timer = setTimeout(() => {
      toast.hidden = true;
    }, 5000);
  });
  update();
  document.body.append(host);
}
