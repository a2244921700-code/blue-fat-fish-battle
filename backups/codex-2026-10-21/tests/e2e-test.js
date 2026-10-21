/* 端到端测试：真实浏览器行为模拟（并发、预连接空连接、内容一致性、安全防护）
 * 运行：node tests/e2e-test.js
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');
function get(url) {
  return new Promise(function (resolve, reject) {
    http.get(url, function (res) {
      var chunks = [];
      res.on('data', function (d) { chunks.push(d); });
      res.on('end', function () { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }); });
    }).on('error', reject);
  });
}
const ROOT = path.join(__dirname, '..');

async function main() {
  const serverProc = spawn(process.execPath, [path.join(ROOT, 'server.js')], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  serverProc.stdout.on('data', d => log += d);
  serverProc.stderr.on('data', d => log += d);
  await new Promise(r => setTimeout(r, 1200));

  let failed = 0;
  const check = (name, cond, extra) => {
    console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' :: ' + extra : ''));
    if (!cond) failed++;
  };

  // 1) 并发 8 请求（浏览器多连接资源加载）
  const t0 = Date.now();
  const urls = ['/index.html', '/lib/three.min.js', '/assets/fish-texture.js', '/js/game.js',
                '/favicon.ico', '/index.html', '/js/game.js', '/lib/three.min.js'];
  const rs = await Promise.all(urls.map(u => get('http://127.0.0.1:8123' + u).then(r => r.status)));
  // favicon.ico 无对应文件，预期 404；其余资源必须全部 200
  const realUrls = rs.slice(0, 4).concat(rs.slice(4).filter((x, i) => i !== 0 || x !== rs[4]));
  check('并发资源全部200（favicon 404 属预期）',
    rs[0] === 200 && rs[1] === 200 && rs[2] === 200 && rs[3] === 200 &&
    rs[4] === 404 && rs[5] === 200 && rs[6] === 200 && rs[7] === 200,
    rs.join(',') + ' | ' + (Date.now() - t0) + 'ms');

  // 2) 预连接空连接不影响服务器正常运行（部分安全软件会给回环流量加延迟，属环境现象）
  const empty = net.connect(8123, '127.0.0.1', () => { /* 挂起不发数据 */ });
  await new Promise(r => setTimeout(r, 300));
  const s = await get('http://127.0.0.1:8123/index.html').then(r => r.status);
  empty.destroy();
  check('预连接空连接时服务器仍正常响应', s === 200);

  // 3) 内容一致性 + 新修复生效
  const disk = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
  const served = (await get('http://127.0.0.1:8123/js/game.js')).body;
  check('game.js 内容与磁盘一致', served === disk);
  check('fallback 修复在服务端生效', served.includes('enterFallbackMode'));

  // 4) 404 与目录穿越防护
  check('404 正常', (await get('http://127.0.0.1:8123/nope.xyz')).status === 404);
  const traversal = (await get('http://127.0.0.1:8123/..%2F..%2FWindows%2Fwin.ini')).status;
  check('目录穿越被拒绝', traversal === 403 || traversal === 404, String(traversal));

  serverProc.kill();
  console.log(failed === 0 ? '===== E2E ALL PASSED =====' : '===== ' + failed + ' FAILED =====');
  process.exit(failed === 0 ? 0 : 1);
}
main().catch(e => { console.error('E2E CRASH:', e); process.exit(1); });
