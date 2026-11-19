# NZ:P Mobile — compatibility shell (incomplete)

This is an independently hosted PWA shell plus an experimental same-page launcher at `mobile-build.html`. The launcher requests the official engine and game packages directly from `nzp.gay`; this repository does not include or redistribute upstream binaries or assets. The controls dispatch keyboard, mouse, and touch input events to the same-page game canvas, following the FTE browser input handlers.

## Upstream inspection

- The official web host is [`nzp-team/nzp-team.github.io`](https://github.com/nzp-team/nzp-team.github.io). Its `index.html` creates a `Module.files` list for `default.fmf`, `nzp/game.pk3`, and `nzp/progs.pk3`, then injects `ftewebgl.js`; it uses `ftewebgl.wasm` and the `#canvas` element. It starts the engine only after `begin()`.
- [`vril-engine`](https://github.com/nzp-team/vril-engine) is GPL-2.0. That does not establish a license for every packaged binary or asset.
- [`nzportable`](https://github.com/nzp-team/nzportable) source and [`assets`](https://github.com/nzp-team/assets) were reviewed via their official GitHub project pages. The assets repository declares CC BY-SA 4.0 (attribution and share-alike apply). The web host itself has no license declaration surfaced in the inspected root files. No assets are copied here.
- The hosted launcher does not publish a supported JS input API. The exact bindings and browser event handling still need inspection against a pinned upstream source revision and the actual `ftewebgl.js` build. Synthetic keyboard/mouse events are not a verified input route; mouse-look often depends on pointer lock, which iOS Safari does not provide as desktop browsers do.

## Run locally

Serve this directory over HTTPS (or localhost), then open `index.html`. Choose `Launch mobile controls preview`, tap Start, and allow the official engine and packages to load from `https://nzp.gay/`. The browser must permit the upstream files to be fetched cross-origin; if not, the experimental launcher will fail and the official page remains available from the home screen. Fullscreen is feature-detected; iOS Safari may ignore it. The service worker caches only this shell.

## Deployment

The shell is published on GitHub Pages at <https://adizon17-design.github.io/NZP-Mobile/>. The experimental launcher depends on remote upstream files and must be validated in a browser that permits those cross-origin requests. Keep game binaries and assets out of this repository. This launcher is not a supported upstream mobile build.

## Status and test report

Last inspected: 2026-11-19. No actual iPhone 15 or Safari device was available in this workspace. No claim of iOS compatibility is made.

| Requirement | Status |
|---|---|
| Shell responsive layout, landscape intent, safe-area CSS | Implemented; not device-tested |
| Official game boot and WASM loading | Experimental launcher added; cross-origin loading not verified |
| Touch movement/look/fire/reload | Keyboard/mouse/touch DOM event bridge added; gameplay not verified |
| Gamepad button/stick routing and reconnect | FTE browser build polls the browser Gamepad API; physical controller not tested |
| Audio, suspend/resume, resolution controls | Not integrated |
| PWA shell manifest/service worker | Implemented; not installed/tested on iPhone |
| Cloudflare Pages configuration | Standard static deployment; no custom MIME overrides needed for shell |
| Automated acceptance tests | Not added; engine bridge absent, so meaningful gameplay tests cannot pass |

## Work required to reach acceptance

1. Confirm the cross-origin file requests succeed from GitHub Pages and the WASM file loads.
2. Verify the default game bindings for use/reload/jump and tune the on-screen button mapping.
3. Test touch movement/look/fire, focus loss, orientation, audio, and Bluetooth gamepad on iPhone Safari; record device and iOS versions.
4. If cross-origin loading is blocked, build a same-origin distribution with confirmed redistribution terms and the required source/notices for GPL components.

## Hosting status

The public GitHub repository is [`adizon17-design/NZP-Mobile`](https://github.com/adizon17-design/NZP-Mobile). GitHub Pages previously deployed the shell; this experimental launcher change has not yet been published or tested on iPhone. Cloudflare Pages is not configured because no Cloudflare account is connected.
