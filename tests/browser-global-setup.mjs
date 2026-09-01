import { once } from 'node:events';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../scripts/build.mjs';
import { createStaticServer } from '../scripts/serve.mjs';

const sourceRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const outputRoot = resolve(sourceRoot, 'dist');
const port = 4174;

export default async function globalSetup() {
  await buildSite({ rootDir: sourceRoot, outputDir: outputRoot });
  const server = createStaticServer({ rootDir: outputRoot });
  server.listen(port, '127.0.0.1');
  await once(server, 'listening');

  return async () => {
    if (!server.listening) return;
    server.closeAllConnections?.();
    await new Promise((resolveClose, rejectClose) => {
      server.close((error) => (error ? rejectClose(error) : resolveClose()));
    });
  };
}
