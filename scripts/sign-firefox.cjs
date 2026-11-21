"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createHash, createHmac, randomUUID } = require("node:crypto");
const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");
const { unzipSync } = require("fflate");

const amo = "https://addons.mozilla.org";
const api = amo + "/api/v5/addons/";
const root = path.resolve(__dirname, "..");

function authHeader() {
  const { AMO_API_KEY: issuer, AMO_API_SECRET: secret } = process.env;
  if (!issuer || !secret) throw new Error("Configure both AMO_API_KEY and AMO_API_SECRET in Actions secrets.");
  const now = Math.floor(Date.now() / 1000);
  const encode = (data) => Buffer.from(JSON.stringify(data)).toString("base64url");
  const token = encode({ alg: "HS256", typ: "JWT" }) + "." +
    encode({ iss: issuer, jti: randomUUID(), iat: now, exp: now + 60 });
  return "JWT " + token + "." + createHmac("sha256", secret).update(token).digest("base64url");
}

async function request(url, { form, allowMissing = false } = {}) {
  if (new URL(url).origin !== amo) throw new Error("Unexpected AMO request origin.");
  const response = await fetch(url, {
    method: form ? "POST" : "GET",
    headers: { Authorization: authHeader() },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`AMO ${response.status} at ${new URL(url).pathname}. Check the submission in Developer Hub and rerun the job.`);
  return response;
}

async function signFirefox({ version, unsigned, sourceFile, wait = delay }) {
  const unpacked = unzipSync(unsigned);
  const manifest = JSON.parse(Buffer.from(unpacked["manifest.json"]));
  assert.equal(manifest.version, version);
  const id = manifest.browser_specific_settings.gecko.id;
  assert.ok(id, "Firefox manifest is missing its add-on ID.");
  const versions = api + "addon/" + encodeURIComponent(id) + "/versions/";
  const detail = versions + encodeURIComponent(version) + "/";
  const existing = await request(detail, { allowMissing: true });
  let submitted;
  if (existing) {
    console.log("Resuming the existing AMO version " + version);
    submitted = await existing.json();
  } else {
    const upload = new FormData();
    upload.set("channel", "unlisted");
    upload.set("upload", new Blob([unsigned]), "firefox.zip");
    let validation = await (await request(api + "upload/", { form: upload })).json();
    const uploadId = validation.uuid;
    assert.ok(uploadId, "AMO did not return an upload ID.");
    while (!validation.processed) {
      await wait(10_000);
      validation = await (await request(api + "upload/" + encodeURIComponent(uploadId) + "/")).json();
    }
    if (!validation.valid) throw new Error("AMO validation failed for upload " + uploadId + ". Check its validation report in Developer Hub.");
    const form = new FormData();
    form.set("upload", uploadId);
    form.set("source", new Blob([readFileSync(sourceFile)]), "source.zip");
    submitted = await (await request(versions, { form })).json();
  }

  for (;;) {
    assert.equal(submitted.version, version);
    assert.equal(submitted.channel, "unlisted");
    assert.ok(!submitted.is_disabled, "Version is disabled in AMO.");
    if (submitted.file?.status === "public") break;
    assert.equal(submitted.file?.status, "unreviewed", "Unexpected AMO review status.");
    await wait(60_000);
    submitted = await (await request(detail)).json();
  }
  const signed = Buffer.from(await (await request(submitted.file.url)).arrayBuffer());
  assert.equal("sha256:" + createHash("sha256").update(signed).digest("hex"), submitted.file.hash,
    "Signed download does not match the hash supplied by AMO.");
  verifyPayload(unpacked, signed);
  return signed;
}

function verifyPayload(unpacked, signed) {
  const files = unzipSync(signed);
  assert.ok(files["META-INF/mozilla.rsa"]?.length, "Missing Mozilla signature.");
  const payload = Object.keys(files).filter((name) => !name.startsWith("META-INF/") && !name.endsWith("/"));
  assert.deepEqual(payload.sort(), Object.keys(unpacked).filter((name) => !name.endsWith("/")).sort());
  for (const name of payload) {
    // AMO can reformat the manifest when signing it.
    if (name === "manifest.json") {
      assert.deepEqual(JSON.parse(Buffer.from(files[name])), JSON.parse(Buffer.from(unpacked[name])));
    } else {
      assert.ok(Buffer.from(files[name]).equals(unpacked[name]), "Signed file differs from tag build: " + name);
    }
  }
}

async function main() {
  const { version } = require("../package.json");
  const base = path.join(root, "dist", `bililive-danmaku-plus-one-firefox-v${version}`);
  const sourceFile = path.join(root, "build", "amo-source.zip");
  execFileSync("git", ["archive", "--format=zip", "-o", sourceFile, "HEAD"], { cwd: root });
  const signed = await signFirefox({ version, unsigned: readFileSync(base + ".zip"), sourceFile });
  writeFileSync(base + ".xpi", signed);
  console.log("Verified Mozilla-signed XPI for " + version);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { signFirefox };
