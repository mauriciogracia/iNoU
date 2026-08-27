const test = require("node:test");
const assert = require("assert");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Router } = require("../dist/api/routes/Router");

test("iNoU Mobile Terminal (/m) & PWA Integration Tests", async (t) => {
  const rootDir = path.resolve(__dirname, "..");
  const router = new Router(rootDir);

  const server = http.createServer((req, res) => {
    router.handleRequest(req, res);
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test("GET /m serves mobile.html with status 200", async () => {
    const res = await fetch(`${baseUrl}/m`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/html/);
    const html = await res.text();
    assert.match(html, /iNoU Mobile Terminal/);
    assert.match(html, /mobile-cmd-input/);
    assert.match(html, /mobile-choice-container/);
  });

  await t.test("GET /mobile also serves mobile.html with status 200", async () => {
    const res = await fetch(`${baseUrl}/mobile`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/html/);
    const html = await res.text();
    assert.match(html, /iNoU Mobile Terminal/);
  });

  await t.test("GET /manifest.json serves PWA Web App Manifest", async () => {
    const res = await fetch(`${baseUrl}/manifest.json`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get("content-type"), /application\/json/);
    const manifest = await res.json();
    assert.strictEqual(manifest.name, "iNoU Mobile Terminal");
    assert.strictEqual(manifest.start_url, "/m");
    assert.strictEqual(manifest.display, "standalone");
  });

  await t.test("GET /sw.js serves Service Worker", async () => {
    const res = await fetch(`${baseUrl}/sw.js`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get("content-type"), /application\/javascript/);
    const sw = await res.text();
    assert.match(sw, /inou-mobile/);
  });
});
