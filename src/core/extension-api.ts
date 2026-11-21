// Use the Promise API for calls made without a callback. Firefox also exposes
// chrome.* for callback-based callers, while older Chromium only exposes chrome.*.
export const extensionApi = (globalThis as typeof globalThis & { browser?: typeof chrome }).browser
  ?? globalThis.chrome
