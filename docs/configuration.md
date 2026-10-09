# Configuration

The CLI reads `appcapsule.config.mjs` from the current directory, or a file supplied with `--config`. It must export an object. Relative config paths are resolved from the config directory; command-line paths are resolved from the current directory. Configs, Vite plugins and journey modules are executable code: only load projects you trust.

| Option             | Default                    | Meaning                                                                                               |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `url`              | Required                   | Running app on `localhost`, `127.0.0.1` or `[::1]`, at `/`. An initial hash is allowed.               |
| `project`          | Config directory           | Root of the Vite app to build.                                                                        |
| `out`              | `capsules/demo.html`       | HTML output path.                                                                                     |
| `title`            | `My app`                   | Text shown in the capsule information panel.                                                          |
| `scenario`         | None                       | ESM journey module with a default async function.                                                     |
| `headed`           | False for scripted capture | Display the recording browser. Manual capture always needs a visible browser.                         |
| `apiOrigins`       | App origin only            | Additional exact HTTP(S) API origins, without a path or trailing slash. Use synthetic-data APIs only. |
| `redactKeys`       | `[]`                       | Additional case-insensitive JSON field names to replace with `[REDACTED]`, recursively.               |
| `timeout`          | `30000`                    | Positive integer in milliseconds for each navigation, assertion and complete journey.                 |
| `maxResponseBytes` | `2000000`                  | Maximum raw API response bytes.                                                                       |
| `maxTotalBytes`    | `20000000`                 | Maximum sanitized response bytes; final HTML gets an additional 10 MB asset allowance.                |
| `overwrite`        | `false`                    | Replace an existing export. CLI equivalent: `--force`.                                                |

Every capture also has a 500-response limit. Set limits deliberately for larger examples. Avoid huge media files: a recipient receives the whole HTML.

## Journeys

```js
export default async function ({ page, context, expect, phase }) {
  // page / context: Playwright's page and isolated browser context.
  // expect: Playwright assertions, configured with the supplied timeout.
  // phase: "capture" or "verify".
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
}
```

The page is already at the configured URL or the exported file. **Do not navigate to the live app inside your journey.** Avoid branching assertions on `phase`: use the same observable checks in both environments. Journeys execute with Node.js privileges and are not sandboxed. Do not put credentials in them or import an untrusted journey.

`init` creates a minimal body assertion. Replace it with meaningful app-specific assertions: AppCapsule can only check what the journey actually exercises.

## Programmatic hooks

The `capture` API also accepts `onProgress(message)` and `onReady(page)`. An `onReady` callback allows your own interactive recorder UI; resolve its promise to finish recording. Without a scenario, verification remains startup-only.

`verify(file, { scenario, timeout, headed })` returns a report. `extractData(html)` parses the manifest without executing the application. Neither function sends telemetry.

## Exit behavior

- Exit 0: command completed; for `verify`, the requested checks passed.
- Exit 1: invalid options, missing resources, failed capture, failed assertions or an offline mismatch.
- `--json` produces JSON on stdout on success (and for a failed verification report). Progress and errors go to stderr. Vite plugins may emit their own logs.
