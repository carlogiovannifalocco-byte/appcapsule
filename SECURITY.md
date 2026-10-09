# Security model

AppCapsule is an exporter for trusted, source-owned applications with synthetic data. It is **not a sandbox**, complete data-loss-prevention system, or security attestation service.

## Trust boundaries

- The Vite config, plugins, application and journey are executable code. They run with the creator's privileges. Do not capture projects or load journeys you do not trust.
- A capsule contains executable frontend code. Recipients should treat unknown HTML files as applications, not inert documents. The runtime, CSP, diagnostics and verification are not designed to resist a malicious app that tampers with them.
- API bodies and frontend code are visible to anyone with the file. Redaction covers named JSON fields and recognizable token patterns, not every kind of secret or personal information.
- Request headers, cookies and storage are not intentionally exported. Data already embedded in application assets is included in the production build. Only recognizable secret patterns are scanned there.
- Capture aborts non-GET/HEAD HTTP requests. It is not a guarantee against every possible side effect of executing an application: even a badly designed GET endpoint can mutate data. Use a disposable demo environment.
- Playback intercepts supported fetch/XHR requests, blocks misses, and uses a CSP that disallows ordinary network resources. This prevents accidental live requests in the supported demo paths. It is not a general information-flow security guarantee.
- A passed report covers its specific startup/journey and verification window. It is not proof about every future action. Reports are unsigned and can be edited.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** feature in this repository's Security tab when available. Do not include credentials, personal data or an exploit against a real user's data in a public issue. For non-sensitive compatibility bugs, a minimal synthetic reproduction in a normal issue is welcome.

The project currently supports the latest release only. Security fixes are prioritized by impact and reproducibility; no response-time guarantee is offered.
