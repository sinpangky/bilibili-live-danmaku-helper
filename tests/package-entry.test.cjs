"use strict";

const assert = require("node:assert/strict");
const { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { unzipSync } = require("fflate");
const { packageArchive } = require("../scripts/package.cjs");

function fixtureProject() {
  const root = mkdtempSync(path.join(os.tmpdir(), "danmaku-echo-package-"));
  const extension = path.join(root, "build", "extension");
  const files = {
    "manifest.json": JSON.stringify({ version: "9.8.7" }),
    "index.html": "<!doctype html>",
    "assets/danmaku-echo-icon.png": "icon",
    "assets/icons/icon-128.png": "icon",
    "background/service-worker.js": "void 0",
    "src/shared.js": "void 0",
    "src/content.js": "void 0",
  };
  for (const [relative, value] of Object.entries(files)) {
    const destination = path.join(extension, ...relative.split("/"));
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, value);
  }
  writeFileSync(path.join(root, "LICENSE"), "test license");
  writeFileSync(path.join(root, "NOTICE.md"), "test notice");
  writeFileSync(path.join(root, "README.md"), "test readme");
  return root;
}

test("creates the same deterministic archive without a platform shell", () => {
  const root = fixtureProject();
  try {
    const first = packageArchive({ root, outputDir: "first output" });
    const second = packageArchive({ root, outputDir: "second output" });
    assert.equal(first.hash, second.hash);
    assert.deepEqual(first.entries, second.entries);
    assert.equal(path.basename(first.destination), "bililive-danmaku-plus-one-v9.8.7.zip");
    const contents = unzipSync(readFileSync(first.destination));
    assert.equal(Buffer.from(contents.LICENSE).toString("utf8"), "test license");
    assert.equal(Buffer.from(contents["NOTICE.md"]).toString("utf8"), "test notice");
    assert.equal(Buffer.from(contents["README.md"]).toString("utf8"), "test readme");
    assert.ok(Object.keys(contents).every((name) => !name.includes("\\")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects incomplete build output before writing a release", () => {
  const root = fixtureProject();
  try {
    rmSync(path.join(root, "build", "extension", "src", "content.js"));
    assert.throws(
      () => packageArchive({ root }),
      /ZIP is missing required entry: src\/content\.js/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("packages the Firefox manifest from its own build without replacing Chromium", () => {
  const root = fixtureProject();
  try {
    const firefox = path.join(root, "build", "firefox");
    cpSync(path.join(root, "build", "extension"), firefox, { recursive: true });
    const manifest = { version: "9.8.7", background: { scripts: ["background/service-worker.js"] } };
    writeFileSync(path.join(firefox, "manifest.json"), JSON.stringify(manifest));
    const chromium = packageArchive({ root });
    const result = packageArchive({ root, browser: "firefox" });
    assert.equal(path.basename(result.destination), "bililive-danmaku-plus-one-firefox-v9.8.7.zip");
    const contents = unzipSync(readFileSync(result.destination));
    assert.deepEqual(JSON.parse(Buffer.from(contents["manifest.json"]).toString()), manifest);
    assert.notDeepEqual(readFileSync(result.destination), readFileSync(chromium.destination));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
