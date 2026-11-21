"use strict";

const fs = require("node:fs");
const path = require("node:path");

const build = path.resolve(__dirname, "..", "build");
const source = path.join(build, "extension");
const target = path.join(build, "firefox");
const manifest = JSON.parse(fs.readFileSync(path.join(source, "manifest.json"), "utf8"));
manifest.background = { scripts: [manifest.background.service_worker] };
manifest.browser_specific_settings = {
  gecko: {
    id: "bilibili-live-danmaku-helper@sinpangky",
    strict_min_version: "140.0",
    data_collection_permissions: {
      required: ["authenticationInfo", "personalCommunications", "websiteContent", "browsingActivity"],
    },
  },
};

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
fs.writeFileSync(path.join(target, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
