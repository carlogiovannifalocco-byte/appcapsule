# Compatibility and troubleshooting

AppCapsule 0.1 is a deliberately bounded exporter for source-owned Vite apps. It is not an arbitrary-website copier or backend emulator.

## Application build

One `index.html` entry, a browser-only production build, and a root URL are supported. Hash routing works because it stays inside the file. Browser-history routers typically inspect the file path and will not work. Use a hash router or a demo entry without history routing.

Vite bundles and AppCapsule embeds JavaScript and CSS. Dynamic imports that Vite can fold into the same output are supported; custom external imports are not. Vite plugins run normally. The exporter overrides `write`, `watch`, `base`, source maps, CSS splitting, module preloading and dynamic chunk splitting. It does not overwrite the app's `dist` directory.

Supported assets include Vite-imported assets and static HTML/CSS references to local public images, fonts and media. Source-relative paths inside nested CSS and runtime-generated public asset paths may need explicit Vite imports. Remote resources, unresolved imports, HTML `base`, and `srcset` are rejected or fail verification. Inline SVG and CSS illustrations work without external assets.

## HTTP data

Only GET and HEAD JSON/text responses are captured. Request identity is method plus full URL, with query parameters sorted by name. Values, duplicate-value order, and API origin remain significant. Fragments are ignored. Request headers are never copied or used for matching.

The same request must return stable data. Conflicting responses cause capture to fail. Freeze timestamps, disable polling, and use deterministic fixture data. Login state, cookies, local/session storage and IndexedDB are not exported. Start the app in a demo mode that does not need authentication.

Response metadata is limited to status, URL and content type. Other response headers are not preserved. JSON keys configured for redaction are changed before verification; if the app needs their original values, use a synthetic-data response instead.

## XHR subset

Async GET/HEAD XHR supports `open`, `send`, `abort`, ready-state changes, load/error/abort/loadend events, content-type headers, and text/JSON/blob/arraybuffer responses derived from captured text. Synchronous XHR, binary fidelity, streaming, upload progress, custom status text and exact browser scheduling semantics are outside the contract. Fetch is the preferred path.

## Runtime boundaries

The replay runtime intercepts fetch and XHR. Misses reject the request and display a message. WebSockets, EventSource, workers, popups, beacons, normal form submissions, external navigation and external resources are unavailable. Hash links continue to work. A CSP adds a second block on ordinary external resource loads.

The original frontend still runs. A client-side filter, modal, tab, sort, in-memory checkbox or temporary project can work. An unrecorded server-side search or server mutation cannot. There is no persistent backend in the export.

## What verification means

A journey pass means that the supplied journey completed against the exported file in an offline Chromium context, without observed page/console errors, replay misses or external HTTP(S) requests. It does not prove that every possible interaction works. Startup checks have even narrower coverage. Delayed work after the verification window and unvisited screens are not covered.

Reports contain the HTML's SHA-256 hash to bind evidence to a particular file. They are not signed security attestations. A user can edit the HTML and report. Do not treat an unknown capsule as trusted executable code.

## Common errors

| Message                              | Next step                                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser executable doesn't exist     | Run `npx playwright install chromium`. On Linux CI use `npx playwright install --with-deps chromium`.                                              |
| No recorded response                 | Exercise that exact GET endpoint while recording, or remove the action from the demo.                                                              |
| HTTP write blocked                   | Use client-side demo state or a read-only API. POST-based GraphQL is not supported.                                                                |
| Same request returned different data | Stabilize API fixtures and timestamps; turn off live polling.                                                                                      |
| External asset cannot be embedded    | Import the resource through Vite or put a supported asset in `public/`.                                                                            |
| Offline journey failed               | Read the reported assertion/error. Common causes: build differs from dev mode, missing fixtures, external assets, authentication, or path routing. |
| Output already exists                | Pick a new path or explicitly use `--force`.                                                                                                       |
| Sensitive query parameter/token      | Remove real credentials and use a synthetic-data endpoint. Secret values are not logged by the detector.                                           |

Creation/verification targets Node.js 22.12+ on Windows, Linux and macOS with Playwright Chromium. Playback is designed for modern desktop browsers; the release's automated playback evidence is Chromium-based. Mobile screenshots are viewport tests, not tests on physical phones.
