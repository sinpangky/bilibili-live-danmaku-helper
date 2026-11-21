# Release checklist

## Mozilla signing

In the [AMO credential manager](https://addons.mozilla.org/en-US/developers/addon/api/key/), use credentials for a developer of the existing Firefox add-on. In GitHub **Settings → Secrets and variables → Actions**, save the JWT issuer as `AMO_API_KEY` and the JWT secret as `AMO_API_SECRET`. Keep the values out of the repository.

Push the annotated version tag on a commit already on `main`. After the build and tests, the release job sends the Firefox ZIP and the tagged source to AMO for self-distribution. The job waits up to 90 minutes for signing. If review takes longer or the download is interrupted, rerun the release job for the same tag. It picks up the existing AMO version and checks its signed payload against the tag build before publication.

## Automated gates

- [ ] Release commit is on `main` and the working tree is clean.
- [ ] `package.json`, `public/manifest.json`, the `v*` tag, and the CHANGELOG heading use the same version.
- [ ] `npm ci` and `npm run check` pass on Windows and Fedora.
- [ ] Stable Chrome and Edge E2E pass without assertion retries.
- [ ] Three consecutive full CI runs pass before a store submission.
- [ ] The Windows release job produces a Chromium ZIP, a Mozilla-signed Firefox XPI, an unsigned Firefox ZIP for debugging, and `SHA256SUMS` covering all three.
- [ ] Each ZIP contains `LICENSE`, `NOTICE.md`, and `README.md`, and the matching Git tag exposes the complete corresponding source.

## Manual live-room acceptance

- [ ] Firefox: temporarily load the Firefox ZIP and check settings, JSON backup, and +1 in ordinary and embedded rooms.
- [ ] Chrome: Bilibili on-video danmaku in normal, web-fullscreen, and native fullscreen modes.
- [ ] The side chat and areas outside the player do not activate on-video danmaku selection.
- [ ] Optional side-chat capsule stays outside the message row and remains reachable while chat scrolls.
- [ ] Plain text, Unicode emoji, inline Bilibili emotes, single room emotes, and mixed text/image order.
- [ ] Honor-level, fan-medal, and floating-danmaku decorations are excluded from message content.
- [ ] +1, copy, reply preparation, favorite, sender correlation, and own-message outline.
- [ ] Existing schema-v2 favorites remain available after updating the unpacked/store build.
- [ ] Manual favorites, custom drag order, unicycle configuration, and favorites-to-unicycle transfers work.
- [ ] No active rate-limit or mute testing through repeated real messages.

## Store submission

- [ ] Review Chinese and English listing text and screenshots.
- [ ] Confirm permissions and host matches are unchanged and necessary.
- [ ] Confirm remote-code answer is “No”.
- [ ] Confirm privacy disclosures match `docs/privacy/index.html`.
- [ ] Load or upload the Chrome package manually; no store API keys are stored in this repository.
