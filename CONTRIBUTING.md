# Contributing

Thanks for helping make portable demos more reliable. A small failing example is often more useful than a large feature request.

## Setup

Use Node.js 22.12+ and npm:

```sh
npm ci
npx playwright install chromium
npm run check
```

On Linux CI: `npx playwright install --with-deps chromium`.

## Changes

1. Reproduce the behavior with synthetic data.
2. Keep the scope narrow. Add a meaningful regression test for behavior changes.
3. Update the compatibility contract if a feature changes what can be exported.
4. Run `npm run check` and `npm run format:check`.
5. Explain the observable change, its limits, and what was verified in your pull request.

Use the local samples with `npm run demo -- --all`. Generated capsules are ignored; screenshots intended for documentation live under `docs/`.

Do not add live-request fallback to the runtime. Do not disable security or verification checks just to make a sample pass. Do not add telemetry without a separate design discussion.

## Releases

Update the package version, generator/runtime labels, changelog and release links together. Build and test from a clean install. `npm pack` creates a prebuilt package; smoke-test the tarball in an isolated folder before attaching it to a GitHub release. Include regenerated demo files and their reports.

## Conduct

Be respectful and specific. Critique the implementation, not the person. Do not post private information or harass other contributors. Maintainers may edit or remove disruptive material and limit participation to keep the project usable.
