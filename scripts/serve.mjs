import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.xml': 'application/xml', '.txt': 'text/plain' };

function isInsideRoot(file) {
  const pathFromRoot = relative(root, file);
  return pathFromRoot === '' || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== '..' && !isAbsolute(pathFromRoot));
}

function send(response, status, body = '') {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(body);
}

export function createStaticServer() {
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method || '')) return send(response, 405, 'Method Not Allowed');

    let pathname;
    try {
      const rawPath = (request.url || '/').split(/[?#]/, 1)[0];
      if (!rawPath.startsWith('/')) return send(response, 400, 'Bad Request');
      pathname = decodeURIComponent(rawPath);
    } catch {
      return send(response, 400, 'Bad Request');
    }
    let file = resolve(root, `.${pathname}`);
    if (!isInsideRoot(file)) return send(response, 403, 'Forbidden');

    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      if (!isInsideRoot(file)) return send(response, 403, 'Forbidden');
      await access(file);
    } catch {
      return send(response, 404, 'Not found');
    }

    response.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    if (request.method === 'HEAD') return response.end();
    createReadStream(file).on('error', () => send(response, 500, 'Server Error')).pipe(response);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] || 4173);
  createStaticServer().listen(port, () => console.log(`Serving http://localhost:${port}`));
}
