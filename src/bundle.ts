import { build, type Plugin } from 'vite';
import { parse, serialize } from 'parse5';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeJson } from './shared.js';
import { assertNoSecrets } from './privacy.js';
import type { CapsuleData } from './types.js';

const MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
export const CSP =
  "default-src 'none'; script-src 'unsafe-inline' data: blob:; style-src 'unsafe-inline' data:; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'";

export async function buildApp(project: string): Promise<string> {
  let publicDir: string | false = false;
  const settings: Plugin = {
    name: 'appcapsule-settings',
    configResolved(c) {
      publicDir = c.publicDir;
    },
  };
  const result = await build({
    // Rollup resolves entry symlinks and Windows short names. Use the same
    // canonical root so Vite computes HTML output paths inside the project.
    root: await realpath(resolve(project)),
    base: './',
    logLevel: 'warn',
    plugins: [settings],
    build: {
      write: false,
      watch: null,
      emptyOutDir: false,
      sourcemap: false,
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      modulePreload: false,
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
  if ('on' in result)
    throw new Error('Vite watch builds are unsupported. Disable build.watch in your Vite config.');
  const chunks = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output);
  const pages = chunks.filter((c) => c.type === 'asset' && c.fileName.endsWith('.html'));
  if (pages.length !== 1)
    throw new Error(
      'AppCapsule needs exactly one HTML entry. Multi-page builds are not supported yet.',
    );
  const page = pages[0]!;
  if (page.type !== 'asset') throw new Error('Missing Vite HTML output.');
  const assets = new Map(
    chunks.map((c) => [c.fileName, Buffer.from(c.type === 'asset' ? c.source : c.code)]),
  );
  const html = await inlineResources(String(page.source), assets, publicDir);
  assertNoSecrets(html, 'the production build');
  return html;
}

export async function inlineResources(
  html: string,
  assets: Map<string, Buffer>,
  publicDir: string | false,
): Promise<string> {
  // parse5 is deliberately used instead of regex to parse HTML attributes.
  const document = parse(html);
  const resource = async (ref: string): Promise<string> => {
    if (/^(data:|blob:|#)/i.test(ref)) return ref;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref))
      throw new Error(`External asset cannot be embedded: ${ref.split('?')[0]}. Use local assets.`);
    const url = new URL(ref, 'https://capsule.invalid/');
    const name = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let bytes = assets.get(name);
    if (!bytes && publicDir) {
      const base = await realpath(publicDir);
      let target: string;
      try {
        target = await realpath(resolve(base, name));
      } catch {
        throw new Error(`Missing public asset: ${name}`);
      }
      const rel = relative(base, target);
      if (rel.startsWith('..') || isAbsolute(rel))
        throw new Error('Public assets must stay inside the public directory.');
      bytes = await readFile(target);
    }
    if (!bytes)
      throw new Error(
        `Asset is not embedded: ${name}. Import it through Vite or put it in public/.`,
      );
    return `data:${MIME[extname(name).toLowerCase()] ?? 'application/octet-stream'};base64,${bytes.toString('base64')}${url.hash}`;
  };
  const css = async (text: string): Promise<string> => {
    if (/@import\s/i.test(text))
      throw new Error('Unresolved CSS @import. Import styles through Vite.');
    const matches = [...text.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)];
    for (const match of matches.reverse()) {
      const replacement = `url("${await resource(match[2]!)}")`;
      text = text.slice(0, match.index) + replacement + text.slice(match.index! + match[0].length);
    }
    return text;
  };
  // Tree node shapes differ by tag. Keep the DOM traversal independent of adapters.
  const visit = async (node: any): Promise<void> => {
    if (node.tagName === 'base')
      throw new Error('HTML <base> is unsupported in an offline capsule.');
    const attrs = node.attrs as { name: string; value: string }[] | undefined;
    if (attrs) {
      const rel = attrs.find((a) => a.name === 'rel')?.value;
      if (
        node.tagName === 'link' &&
        ['modulepreload', 'preload', 'prefetch', 'preconnect', 'dns-prefetch'].includes(rel ?? '')
      ) {
        node.parentNode.childNodes = node.parentNode.childNodes.filter((c: any) => c !== node);
        return;
      }
      if (node.tagName === 'script') {
        const src = attrs.find((a) => a.name === 'src');
        if (src) {
          const name = new URL(src.value, 'https://capsule.invalid/').pathname.replace(/^\/+/, '');
          const bundled = assets.get(name);
          if (!bundled || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(src.value))
            throw new Error(
              'A script was not bundled by Vite. Import it from the application entry.',
            );
          node.attrs = attrs.filter((a) => !['src', 'crossorigin', 'integrity'].includes(a.name));
          node.childNodes = [
            {
              nodeName: '#text',
              value: bundled.toString('utf8').replace(/<\/script/gi, '<\\/script'),
              parentNode: node,
            },
          ];
          return;
        }
      }
      if (node.tagName === 'link' && rel === 'stylesheet') {
        const href = attrs.find((a) => a.name === 'href')?.value ?? '';
        const name = new URL(href, 'https://capsule.invalid/').pathname.replace(/^\/+/, '');
        const bundled = assets.get(name);
        if (!bundled || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href))
          throw new Error('An external stylesheet was not bundled. Import styles through Vite.');
        node.tagName = node.nodeName = 'style';
        node.attrs = [];
        node.childNodes = [
          {
            nodeName: '#text',
            value: (await css(bundled.toString('utf8'))).replace(/<\/style/gi, '<\\/style'),
            parentNode: node,
          },
        ];
        return;
      }
      if (attrs.some((a) => a.name === 'srcset'))
        throw new Error('srcset is not supported yet. Use a single imported image for this demo.');
      for (const attr of attrs) {
        if (attr.name === 'style') attr.value = await css(attr.value);
        if (
          attr.name === 'src' &&
          ['img', 'source', 'video', 'audio', 'input'].includes(node.tagName)
        )
          attr.value = await resource(attr.value);
        if (attr.name === 'poster') attr.value = await resource(attr.value);
        if (node.tagName === 'script' && attr.name === 'src')
          throw new Error(
            'A script was not bundled by Vite. Import it from the application entry.',
          );
        if (node.tagName === 'link' && attr.name === 'href')
          attr.value = await resource(attr.value);
      }
      if (
        node.tagName === 'meta' &&
        attrs.some(
          (a) => a.name === 'http-equiv' && /^(refresh|content-security-policy)$/i.test(a.value),
        )
      ) {
        node.parentNode.childNodes = node.parentNode.childNodes.filter((c: any) => c !== node);
      }
    }
    if (node.tagName === 'style')
      for (const child of node.childNodes ?? [])
        if (child.nodeName === '#text') child.value = await css(child.value);
    for (const child of [...(node.childNodes ?? [])]) await visit(child);
    if (node.content) await visit(node.content);
  };
  await visit(document);
  return serialize(document);
}

export async function assemble(html: string, data: CapsuleData): Promise<string> {
  const runtime = await readFile(fileURLToPath(new URL('./runtime.js', import.meta.url)), 'utf8');
  const license = await readFile(fileURLToPath(new URL('../LICENSE', import.meta.url)), 'utf8');
  const prelude =
    `<!-- AppCapsule runtime license. The application retains its own license.\n${license}\n-->` +
    `<meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="referrer" content="no-referrer">` +
    `<script id="appcapsule-data" type="application/json">${safeJson(data)}</script>` +
    `<script>${runtime.replace(/<\/script/gi, '<\\/script')}</script>`;
  const output = html.replace(/<head(?:\s[^>]*)?>/i, (m) => m + prelude);
  if (output === html) throw new Error('The Vite build has no <head> element.');
  return output;
}
