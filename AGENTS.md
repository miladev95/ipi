# AGENTS.md

This file provides context for AI coding agents working on the **IP Information** Chrome Extension project. Read this first before making changes.

## Project Overview

A minimal **Chrome Extension (Manifest V3)** that displays the user's public IP address and geolocation information in a popup. There is no build system, no bundler, no framework, and no package manager — just plain HTML, CSS, and vanilla JavaScript that runs directly in the browser.

## Tech Stack

- **Manifest Version:** 3
- **JavaScript:** Vanilla ES6+ (no modules, no TypeScript, no bundler)
- **CSS:** Plain CSS (no preprocessor, no framework)
- **HTML:** Plain HTML5
- **External APIs:**
  - Primary: `https://ipapi.co/json/`
  - Fallback: `https://ifconfig.co/json`

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
- `fetchIPInfo()` — shows loading state, iterates `API_ENDPOINTS`, calls `displayIPInfo` on first success, otherwise calls `showError`.
- `displayIPInfo(data)` — maps API response fields (`ip`, `country_name`, `region`, `postal`, `timezone`, `org`, `latitude`, `longitude`) into the DOM elements with matching IDs. Falls back between field names from the two APIs (e.g. `data.ip || data.IPv4`, `data.country_name || data.country`).
- `showError(message)` — displays the error section with a Retry button.
- `copyToClipboard(text)` — uses `navigator.clipboard.writeText`, shows a transient "Copied!" notification appended to `document.body`.

### DOM ID contract
The element IDs in `popup.html` (`ip`, `country`, `region`, `city`, `postal_code`, `timezone`, `org`, `latitude`, `longitude`) **must match the keys** in the `fields` object inside `displayIPInfo()`. If you add a new info field, add the span in `popup.html`, then add the matching key in the `fields` mapping.

### Event listeners (registered at bottom of `popup.js`)
- `#refreshBtn` click → `fetchIPInfo`
- `#retryBtn` click → `fetchIPInfo`
- Every `.copy-btn` click → copies the text of the element whose ID matches `data-field`

## Manifest Notes (`manifest.json`)

- `manifest_version: 3` — do **not** downgrade to MV2.
- `permissions: ["activeTab"]` — minimal. There is no `storage`, `tabs`, `scripting`, etc.
- `host_permissions: ["https://ipapi.co/*"]` — **only ipapi.co is whitelisted.** `ifconfig.co` is used as a runtime fallback but is NOT listed in `host_permissions`. This means the fallback will fail due to CORS/permission errors in strict MV3. If the fallback should actually work, add `https://ifconfig.co/*` to `host_permissions`. (This is a known gap — confirm with the user before changing manifest.)
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
- Edit `API_ENDPOINTS` in `popup.js`.
- If the new host is not already in `manifest.json`'s `host_permissions`, add it there (required for MV3 `fetch` from a popup).

### Add a new UI section / state
- Add the markup in `popup.html`, initially hidden via `style="display: none;"`.
- Add the show/hide logic in `popup.js` — there is no central state manager, just direct `style.display` toggles in `fetchIPInfo` / `displayIPInfo` / `showError`.

## Known Issues / Gotchas

1. **Fallback API not whitelisted.** `ifconfig.co` is called at runtime but not listed in `host_permissions` — under strict MV3 enforcement this will be blocked. See Manifest Notes.
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