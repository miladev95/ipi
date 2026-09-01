# AGENTS.md

This file provides context for AI coding agents working on the **IP Information** Chrome Extension project. Read this first before making changes.

## Project Overview

A minimal **Chrome Extension (Manifest V3)** that displays the user's public IP address and geolocation information in a popup. There is no build system, no bundler, no framework, and no package manager — just plain HTML, CSS, and vanilla JavaScript that runs directly in the browser.

## Tech Stack

- **Manifest Version:** 3
- **JavaScript:** Vanilla ES6+ (no modules, no TypeScript, no bundler)
- **CSS:** Plain CSS (no preprocessor, no framework)
- **HTML:** Plain HTML5
- **External APIs (6 providers, tried in order until one succeeds):**
  1. `https://ipapi.co/json/`
  2. `https://ipwho.is/`
  3. `https://free.freeipapi.com/api/json`
  4. `https://ipinfo.io/json`
  5. `https://ifconfig.co/json`
  6. `https://api.country.is/` (IP + country only — last-resort fallback)

  All six hosts **must** be listed in `host_permissions` in `manifest.json` or MV3 will block the request.

## File Structure

```
.
├── manifest.json     # Extension manifest (MV3)
├── popup.html        # Popup UI markup
├── popup.js          # All extension logic (API calls, DOM updates, clipboard)
├── styles.css        # All styling
├── s.jpg            # Screenshot used in README
├── README.md         # User-facing documentation
└── .gitignore        # Ignores .idea/
```

Every file lives at the extension root. There are no subdirectories, no `src/` folder, no `dist/` output. Paths in `manifest.json`, `popup.html` (`<link>`, `<script>`), and `popup.js` are all relative to the extension root.

## Architecture

The extension is intentionally tiny — a single popup with three states: **loading**, **content**, and **error**.

### Entry points
- `manifest.json` → declares `action.default_popup: "popup.html"`
- `popup.html` → loads `styles.css` and `popup.js`
- `popup.js` → registers DOM listeners and immediately calls `fetchIPInfo()` on script execution

### State machine (in `popup.js`)
The popup toggles between three sections by setting `style.display`:
- `#loading` — shown during fetch
- `#content` — shown on success (holds the info rows)
- `#error-container` — shown when both API endpoints fail

There is **no reactive framework**; DOM updates are done by directly mutating `textContent` and `style.display`.

### Key functions in `popup.js`
- `fetchWithTimeout(url, timeout)` — wraps `fetch` with an `AbortController` (default 5000 ms timeout).
- `fetchIPInfo()` — shows loading state, iterates `PROVIDERS`, calls `displayIPInfo` on first success, otherwise calls `showError`.
- `displayIPInfo(fields, providerName)` — maps the already-normalized `fields` object into DOM elements and shows the provider label in the header.
- `showError(message)` — displays the error section with a Retry button.
- `copyToClipboard(text)` — uses `navigator.clipboard.writeText`, shows a transient "Copied!" notification appended to `document.body`.

### Provider architecture
`popup.js` defines a `PROVIDERS` array of objects, each with three fields:
- `name` (string) — short identifier shown in the popup header (e.g. `"ipapi.co"`).
- `url` (string) — HTTPS endpoint. Must be in `manifest.json` `host_permissions`.
- `normalize(data)` (function) — takes the raw API JSON and returns a **unified field object** with the keys: `ip`, `country`, `region`, `city`, `postal_code`, `timezone`, `org`, `latitude`, `longitude`. May `throw` to mark the response as unusable (e.g. `ipwho.is` returns `{success: false, ...}`).

`fetchIPInfo` validates that `fields.ip` is set before displaying; otherwise it treats the response as a failure and moves to the next provider. The loop logs each failure with the provider's name to the console.

### DOM ID contract
The element IDs in `popup.html` (`ip`, `country`, `region`, `city`, `postal_code`, `timezone`, `org`, `latitude`, `longitude`) **must match the keys** in the `fields` object inside `displayIPInfo()`. If you add a new info field, add the span in `popup.html`, then add the matching key in the `fields` mapping.

### Event listeners (registered at bottom of `popup.js`)
- `#refreshBtn` click → `fetchIPInfo`
- `#retryBtn` click → `fetchIPInfo`
- Every `.copy-btn` click → copies the text of the element whose ID matches `data-field`

## Manifest Notes (`manifest.json`)

- `manifest_version: 3` — do **not** downgrade to MV2.
- `permissions: ["activeTab"]` — minimal. There is no `storage`, `tabs`, `scripting`, etc.
- `host_permissions` — **all 6 provider hosts must be listed.** Adding a new provider without updating `host_permissions` will cause the fetch to fail under MV3. The current list is `ipapi.co`, `ipwho.is`, `free.freeipapi.com`, `ipinfo.io`, `ifconfig.co`, `api.country.is` (all under `https://` and `/*`).
- No background service worker, no content scripts, no options page.

## Permissions & Privacy

- No data is stored. No `chrome.storage` usage.
- No tracking, no analytics.
- All requests are made on-demand when the popup opens or when refresh/retry is clicked.

## Build / Run / Install

There is no build step. To install:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project directory

To iterate: edit files, then click the refresh icon on the extension card in `chrome://extensions/` to reload.

## How to Debug

- **Popup DevTools:** Right-click the extension popup → "Inspect" to open DevTools for `popup.html`.
- **Console errors** usually come from API failures (`Failed to fetch`, HTTP errors, or CORS). Check the Network tab.
- **API rate limits:** `ipapi.co` free tier is 1,000 requests/day. If rate-limited, the fallback (`ifconfig.co`) is attempted but may also be blocked by missing `host_permissions` (see Manifest Notes).
- **`fetch` timeouts:** 5 seconds per endpoint via `AbortController`.
- **Clipboard failures:** Some contexts block `navigator.clipboard.writeText` (insecure origins, missing permissions). Errors are logged to console but not surfaced to the UI.

## Coding Conventions

- **No comments** unless explicitly requested by the user. The existing code has only a few header comments — keep additions minimal.
- **No external dependencies.** Do not introduce `package.json`, `npm`, bundlers, frameworks (React, Vue, etc.), or CDNs.
- **Vanilla DOM APIs only.** No jQuery, no helper libraries.
- **Match the existing style:**
  - 2-space indentation in HTML/CSS/JS.
  - Single quotes for JS strings (see existing code).
  - Lowercase `const` for immutable bindings, `let` only when reassigned.
  - Async/await over `.then()` chains.
  - CSS uses kebab-case class names, BEM-like flat naming (`.info-item`, `.copy-btn`, `.error-container`).
- **Keep the popup at `width: 450px`** as defined in `.container` unless intentionally resizing.
- **Preserve the field-name fallback pattern** in `displayIPInfo` (`data.fieldA || data.fieldB || '-'`) — both APIs return slightly different keys.
- **Do not add a background service worker, content script, or options page** unless explicitly requested. The current scope is intentionally minimal.

## Common Tasks

### Add a new info field
1. Add a `<span class="value" id="<field>">-</span>` inside an `.info-item` block in `popup.html`.
2. Add the key to the `fields` mapping in `displayIPInfo()` in `popup.js`, including any API-specific fallback names.
3. If the field should be copyable, add `<button class="copy-btn" data-field="<field>" title="Copy">📋</button>` next to it.

### Change or add an API endpoint
- Add a provider object to `PROVIDERS` in `popup.js` with `name`, `url`, and `normalize(data)`. The `normalize` function must return an object with the unified field keys (`ip`, `country`, `region`, `city`, `postal_code`, `timezone`, `org`, `latitude`, `longitude`) and may `throw` to mark the response as unusable.
- If the new host is not already in `manifest.json`'s `host_permissions`, add it there (required for MV3 `fetch` from a popup). Also confirm the API sends `Access-Control-Allow-Origin: *` (or echoes the request origin) — without CORS, the popup fetch will be blocked.

### Add a new UI section / state
- Add the markup in `popup.html`, initially hidden via `style="display: none;"`.
- Add the show/hide logic in `popup.js` — there is no central state manager, just direct `style.display` toggles in `fetchIPInfo` / `displayIPInfo` / `showError`.

## Known Issues / Gotchas

1. **`ifconfig.co` CORS.** `ifconfig.co` does not send an `Access-Control-Allow-Origin` header. It is whitelisted in `host_permissions` and will work, but in some strict MV3 contexts the fetch may be blocked at the CORS preflight stage. The remaining 5 providers cover this case.
2. **`navigator.clipboard` requires secure context.** Works on `chrome-extension://` but not on plain `http://` if you ever test by opening `popup.html` directly outside the extension.
4. **No retry/backoff.** Failures immediately surface to the user; the only recovery is the manual Retry button.
5. **Icon** — there is no extension icon configured (no `default_icon` in `action`, no `icons` at root). The popup works but Chrome will use a default placeholder.

## Things to NOT do

- ❌ Don't introduce a build system (Webpack/Vite/Rollup/esbuild/Parcel).
- ❌ Don't add `package.json` or `node_modules`.
- ❌ Don't add TypeScript or a transpiler.
- ❌ Don't add a framework (React/Vue/Svelte/etc.).
- ❌ Don't downgrade to Manifest V2.
- ❌ Don't add analytics, tracking, or remote code loading.
- ❌ Don't add comments explaining what the code does.