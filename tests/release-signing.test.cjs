"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { test } = require("node:test");
const { zipSync, strToU8 } = require("fflate");
const { signFirefox } = require("../scripts/sign-firefox.cjs");

const version = "1.2.3";
const manifest = { version, browser_specific_settings: { gecko: { id: "fixture@example.org" } } };
const files = { "manifest.json": strToU8(JSON.stringify(manifest)), "content.js": strToU8("void 0") };
const unsigned = zipSync(files);
const signedFiles = { ...files, "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
  "META-INF/mozilla.rsa": strToU8("test signature placeholder") };

function mockAmo(t, steps) {
  t.mock.method(global, "fetch", async (url, options) => {
    const step = steps.shift();
    assert.ok(step, "Unexpected AMO request");
    assert.equal(new URL(url).origin, "https://addons.mozilla.org");
    assert.equal(options.method, step.method ?? "GET");
    assert.ok(url.endsWith(step.path), String(url));
    assert.match(options.headers.Authorization, /^JWT [^.]+\.[^.]+\.[^.]+$/);
    if (step.check) await step.check(options.body);
    return step.response;
  });
  for (const key of ["AMO_API_KEY", "AMO_API_SECRET"]) {
    const previous = process.env[key];
    process.env[key] = "offline-fixture";
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  t.after(() => assert.equal(steps.length, 0));
}

const detail = "/versions/1.2.3/";
const download = "https://addons.mozilla.org/downloads/file/1/test.xpi";
function approved(bytes) {
  return Response.json({ version, channel: "unlisted", file: {
    status: "public", url: download,
    hash: "sha256:" + createHash("sha256").update(bytes).digest("hex"),
  } });
}
const run = () => signFirefox({ version, unsigned, sourceFile: __filename, wait: async () => {} });

test("submits the release ZIP and source, waits for AMO approval, then accepts its signed payload", async (t) => {
  const signed = zipSync(signedFiles);
  mockAmo(t, [
    { path: detail, response: new Response(null, { status: 404 }) },
    { method: "POST", path: "/upload/", check: async (form) => {
      assert.equal(form.get("channel"), "unlisted");
      assert.deepEqual(new Uint8Array(await form.get("upload").arrayBuffer()), unsigned);
    }, response: Response.json({ uuid: "upload-id", processed: false }) },
    { path: "/upload/upload-id/", response: Response.json({ processed: true, valid: true }) },
    { method: "POST", path: "/versions/", check: (form) => {
      assert.equal(form.get("upload"), "upload-id");
      assert.ok(form.get("source").size > 0);
    }, response: Response.json({ version, channel: "unlisted", file: { status: "unreviewed" } }) },
    { path: detail, response: approved(signed) },
    { path: download, response: new Response(signed) },
  ]);
  assert.deepEqual(await run(), Buffer.from(signed));
});

test("resumes an approved version and refuses a different build under the same version", async (t) => {
  const different = zipSync({ ...signedFiles, "content.js": strToU8("void 1") });
  mockAmo(t, [{ path: detail, response: approved(different) }, { path: download, response: new Response(different) }]);
  await assert.rejects(run, /Signed file differs/);
});

test("never accepts the unsigned ZIP as an approved XPI", async (t) => {
  mockAmo(t, [{ path: detail, response: approved(unsigned) }, { path: download, response: new Response(unsigned) }]);
  await assert.rejects(run, /Missing Mozilla signature/);
});

test("does not treat an authentication error as a new version", async (t) => {
  mockAmo(t, [{ path: detail, response: new Response(null, { status: 403 }) }]);
  await assert.rejects(run, /AMO 403/);
});

test("rejects a signed download when its SHA256 differs from AMO metadata", async (t) => {
  const signed = zipSync(signedFiles);
  mockAmo(t, [{ path: detail, response: approved(signed) }, { path: download, response: new Response(unsigned) }]);
  await assert.rejects(run, /hash supplied by AMO/);
});

test("does not submit a version when AMO rejects the upload", async (t) => {
  mockAmo(t, [
    { path: detail, response: new Response(null, { status: 404 }) },
    { method: "POST", path: "/upload/", response: Response.json({ uuid: "rejected", processed: true, valid: false }) },
  ]);
  await assert.rejects(run, /AMO validation failed/);
});
