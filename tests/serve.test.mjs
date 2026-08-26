import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { once } from 'node:events';
import { createStaticServer } from '../scripts/serve.mjs';

let server;
let port;

test.before(async () => {
  server = createStaticServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  port = server.address().port;
});

test.after(async () => {
  server.close();
  await once(server, 'close');
});

function get(path) {
  return new Promise((resolveRequest, reject) => {
    const req = request({ host: '127.0.0.1', port, path }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolveRequest({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('GET / は Windows でも 200 でトップページを返す', async () => {
  const response = await get('/');
  assert.equal(response.status, 200);
  assert.match(response.body, /仕事のデータを、外に出さずに処理。/);
});

for (const [path, contentType] of [
  ['/text/list-compare/', 'text/html'],
  ['/csv/columns/', 'text/html'],
  ['/csv/duplicate-check/', 'text/html'],
  ['/csv/remove-empty-rows/', 'text/html'],
  ['/csv/merge/', 'text/html'],
  ['/privacy/', 'text/html'],
  ['/terms/', 'text/html'],
  ['/assets/site.css', 'text/css'],
  ['/shared/list-compare-app.js', 'text/javascript']
]) {
  test(`GET ${path} は 200`, async () => {
    const response = await get(path);
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], new RegExp(contentType));
  });
}

test('存在しないパスは 404', async () => assert.equal((await get('/not-found')).status, 404));
test('エンコードされた dist 外へのパストラバーサルを 403 で拒否する', async () => assert.equal((await get('/%2e%2e%2fpackage.json')).status, 403));
test('Windows 区切り文字を使うパストラバーサルを 403 で拒否する', async () => assert.equal((await get('/%5c..%5cpackage.json')).status, 403));
