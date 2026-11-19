# NZ:P Mobile — shell preview (not yet playable)

This is an independent PWA shell and preview deployment. Touch and Bluetooth controller input are not connected to the game, and this build is not verified on iPhone 15. No upstream engine, WASM, game binary, or asset is included.

## Official source review

- The official WebGL launcher is in [nzp-team/nzp-team.github.io](https://github.com/nzp-team/nzp-team.github.io). It loads `ftewebgl.js` and `ftewebgl.wasm`, plus `default.fmf`, `nzp/game.pk3`, and `nzp/progs.pk3`, then starts after a user click.
- The reviewed [Vril engine input layer](https://github.com/nzp-team/vril-engine/blob/main/source/input.c) supports keyboard/mouse and gamepad. Its SDL backend maps gamepad buttons, sticks, and connect/disconnect events. That does not establish an input bridge for the separate FTE WebGL build used by the official page. No supported JavaScript input API was found in the launcher.
- Vril is GPL-2.0; the [assets repository](https://github.com/nzp-team/assets/blob/main/LICENSE.md) declares CC BY-SA 4.0. The web host’s redistribution terms for all packaged files have not been established. Nothing from those repositories is copied here.

## Try the preview

Open <https://adizon17-design.github.io/NZP-Mobile/>. It demonstrates the shell only. The “Open official NZ:P” button opens the upstream page; the shell cannot send input into that cross-origin page. iOS Safari fullscreen behavior, game boot, audio, and gameplay are unverified.

## Hosting and setup

The public repository is [adizon17-design/NZP-Mobile](https://github.com/adizon17-design/NZP-Mobile). GitHub Pages is enabled from the `main` branch root and the initial deployment succeeded. `wrangler.toml` is included for future Cloudflare Pages deployment; Cloudflare is not configured. The service worker caches only the shell. Do not add game files until redistribution rights and notices are confirmed.

For a playable version, the game and launcher must be hosted same-origin with a verified bridge that routes touch/gamepad input to engine APIs and releases held inputs on interruption.

## Test report

- Verified: JS syntax checks for `mobile.js` and `sw.js`; GitHub Pages build/deployment succeeded; the published page returns the NZ:P Mobile shell.
- Not verified: game/WASM/assets load, touch controls, gamepad routing, audio, suspend/resume, or iPhone 15 Safari behavior. No iPhone device was available; no compatibility claim is made.

## Remaining work

1. Pin and inspect the exact official FTE WebGL build and its input event path.
2. Confirm redistribution terms for the web build and packaged files.
3. Implement the input bridge inside the same-origin launcher/engine.
4. Test initialization, gameplay, multitouch, controller reconnect, orientation, audio, and resume on a real iPhone 15; document iOS version and results.
5. Set up Cloudflare Pages if desired, then point the domain after the functional integration is complete.
