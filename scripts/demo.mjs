import { createServer } from 'vite';
import { capture } from '../dist/index.js';
import { resolve } from 'node:path';

const names = process.argv.includes('--all')
  ? ['signal', 'catalog', 'fieldbook']
  : [process.argv[2] ?? 'signal'];
for (const name of names) {
  if (!['signal', 'catalog', 'fieldbook'].includes(name))
    throw new Error('Choose signal, catalog, fieldbook or --all.');
  const server = await createServer({
    root: resolve(`examples/${name}`),
    server: { host: '127.0.0.1', port: 0 },
  });
  try {
    await server.listen();
    const port = server.httpServer.address().port;
    const result = await capture({
      url: `http://127.0.0.1:${port}`,
      project: `examples/${name}`,
      out: `capsules/${name}.html`,
      title: {
        signal: 'Signal — a little room for good work',
        catalog: 'Objects — a thoughtful collection',
        fieldbook: 'Fieldbook — a small reading room',
      }[name],
      scenario: `examples/${name}/journey.mjs`,
      overwrite: true,
      onProgress: console.log,
    });
    console.log(
      `\n${result.file}\n${(result.bytes / 1024).toFixed(1)} KB · ${result.data.fixtures.length} recorded responses · offline journey passed`,
    );
  } finally {
    await server.close();
  }
}
