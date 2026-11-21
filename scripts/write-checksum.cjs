"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const base = `bililive-danmaku-plus-one-v${packageJson.version}`;
const firefox = `bililive-danmaku-plus-one-firefox-v${packageJson.version}`;
const lines = [base + ".zip", firefox + ".zip", firefox + ".xpi"].map((archiveName) => {
  const bytes = fs.readFileSync(path.join(dist, archiveName));
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  return `${digest}  ${archiveName}`;
});
fs.writeFileSync(path.join(dist, "SHA256SUMS"), `${lines.join("\n")}\n`, "utf8");
console.log(lines.join("\n"));
