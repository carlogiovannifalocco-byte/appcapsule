# Roadmap

The first release proves a narrow loop: source-owned Vite app → stable recorded data → portable HTML → offline journey verification.

## Next

- Better asset diagnostics and support for `srcset` and nested CSS asset paths.
- An optional automatic interaction recorder that generates editable Playwright journeys.
- Report comparison between two capsule exports.
- Broader playback testing in Firefox and WebKit.
- A documented way to choose custom response fixtures instead of live capture.

## Requires design work

- Stateful mock mutations with explicit reset behavior.
- History-router adaptation that preserves URL semantics under `file:`.
- More complete XHR semantics and response header selection.
- Streaming responses, workers and complex media.

## Not a goal

- Cloning third-party products or bypassing authentication.
- Capturing production customer data by default.
- Claiming an entire application works because one journey passed.
- Operating as a security sandbox for untrusted applications.

There are no promised delivery dates. Small reproducible examples and compatibility tests are the most useful contributions.
