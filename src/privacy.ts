const PRIVATE_KEYS =
  /^(password|passwd|authorization|cookie|set-cookie|token|access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?key|client[_-]?secret|private[_-]?key|secret|session[_-]?(id|token))$/i;
const SECRET_PATTERNS: [string, RegExp][] = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['provider API key', /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{28,}|AKIA[A-Z0-9]{16})\b/],
  ['JSON Web Token', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/],
];

export function assertPublicUrl(input: string): void {
  const url = new URL(input);
  if (url.username || url.password)
    throw new Error('Credentials in URLs cannot be exported. Use a synthetic-data session.');
  for (const key of url.searchParams.keys()) {
    if (PRIVATE_KEYS.test(key) || /^(token|key|auth|signature|sig)$/i.test(key)) {
      throw new Error(
        `Sensitive query parameter "${key}" cannot be exported. Remove it from your demo app.`,
      );
    }
  }
  assertNoSecrets(input, 'URL');
}

export function assertNoSecrets(input: string, where: string): void {
  for (const [label, pattern] of SECRET_PATTERNS) {
    if (pattern.test(input))
      throw new Error(
        `Possible ${label} found in ${where}. Export stopped; the value has not been logged.`,
      );
  }
}

export function sanitizeBody(
  body: string,
  contentType: string,
  extraKeys: string[] = [],
): { body: string; redactions: number } {
  let redactions = 0;
  if (/\bjson\b|\+json\b/i.test(contentType)) {
    let value: unknown;
    try {
      value = JSON.parse(body);
    } catch {
      throw new Error('An API response declares JSON but contains invalid JSON.');
    }
    const extra = new Set(extraKeys.map((k) => k.toLowerCase()));
    const walk = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        return Object.fromEntries(
          Object.entries(v).map(([k, x]) => {
            if (PRIVATE_KEYS.test(k) || extra.has(k.toLowerCase())) {
              redactions++;
              return [k, '[REDACTED]'];
            }
            return [k, walk(x)];
          }),
        );
      }
      return v;
    };
    body = JSON.stringify(walk(value));
  }
  assertNoSecrets(body, 'an API response');
  return { body, redactions };
}
