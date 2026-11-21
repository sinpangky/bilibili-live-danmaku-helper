"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const extensionRoot = process.argv[2]
  ? path.resolve(root, process.argv[2])
  : path.join(root, "build", "extension");
const manifestPath = path.join(extensionRoot, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

if (manifest.version !== packageJson.version) {
  throw new Error(
    `Version mismatch: package.json is ${packageJson.version}, manifest.json is ${manifest.version}. `
      + "Run npm run package to synchronize them."
  );
}
if (manifest.manifest_version !== 3) {
  throw new Error("manifest_version must be 3");
}

const referencedFiles = [
  manifest.action && manifest.action.default_popup,
  manifest.options_ui && manifest.options_ui.page,
  manifest.background && manifest.background.service_worker,
  ...(manifest.background?.scripts || []),
  ...Object.values(manifest.icons || {}),
  ...Object.values((manifest.action && manifest.action.default_icon) || {}),
  ...manifest.content_scripts.flatMap((entry) => [...(entry.js || []), ...(entry.css || [])])
].filter(Boolean);

for (const relativePath of referencedFiles) {
  if (!fs.existsSync(path.join(extensionRoot, relativePath))) {
    throw new Error(`Manifest references missing file: ${relativePath}`);
  }
}

const allowed = "*://live.bilibili.com/*";
const matches = manifest.content_scripts.flatMap((entry) => entry.matches);
if (JSON.stringify(manifest.host_permissions) !== JSON.stringify([allowed])
    || matches.length !== 1 || matches[0] !== allowed
    || !manifest.content_scripts[0].all_frames
    || !manifest.content_scripts[0].js.includes("src/content.js")) {
  throw new Error("Expected the Bilibili Live content script in all matching frames");
}
const gecko = manifest.browser_specific_settings?.gecko;
if (path.basename(extensionRoot) === "firefox") {
  if (!gecko?.id || manifest.background?.scripts?.length !== 1 || manifest.background.service_worker) {
    throw new Error("Expected a Firefox event page and stable extension ID");
  }
} else if (!manifest.background?.service_worker) {
  throw new Error("Expected a Chromium background service worker");
}

const popupHtml = fs.readFileSync(
  path.join(extensionRoot, manifest.action.default_popup),
  "utf8"
);
if (popupHtml.includes("\0") || !popupHtml.includes('id="app"')
    || !popupHtml.includes('type="module"')) {
  throw new Error("Popup HTML is empty or malformed");
}
const popupScriptMatch = popupHtml.match(/<script[^>]+src="([^"]+)"[^>]*>/);
if (!popupScriptMatch) {
  throw new Error("Popup HTML does not reference a JavaScript module");
}
const popupScriptPath = popupScriptMatch[1].replace(/^(?:\.\/|\/)/, "");
const popupSource = fs.readFileSync(path.join(extensionRoot, popupScriptPath), "utf8");
if (/\bprocess\.env\b/.test(popupSource)) {
  throw new Error("Popup bundle contains an unresolved Node.js process.env reference");
}

console.log(`Manifest OK (${referencedFiles.length} referenced files, ${matches.length} host matches): ${extensionRoot}`);
