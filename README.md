# NZ:P Mobile — compatibility shell (incomplete)

This is an independently hosted PWA shell for investigating iPhone compatibility. It **does not yet make NZ:P playable on touch or gamepad**. The official page is opened in a cross-origin frame, which cannot be controlled by this shell. No upstream code, WASM, binaries, or game assets are included.

## Upstream inspection

- The official web host is [`nzp-team/nzp-team.github.io`](https://github.com/nzp-team/nzp-team.github.io). Its `index.html` creates a `Module.files` list for `default.fmf`, `nzp/game.pk3`, and `nzp/progs.pk3`, then injects `ftewebgl.js`; it uses `ftewebgl.wasm` and the `#canvas` element. It starts the engine only after `begin()`.
- [`vril-engine`](https://github.com/nzp-team/vril-engine) is GPL-2.0. That does not establish a license for every packaged binary or asset.
- [`nzportable`](https://github.com/nzp-team/nzportable) source and [`assets`](https://github.com/nzp-team/assets) were reviewed via their official GitHub project pages. The assets repository declares CC BY-SA 4.0 (attribution and share-alike apply). The web host itself has no license declaration surfaced in the inspected root files. No assets are copied here.
- The hosted launcher does not publish a supported JS input API. The exact bindings and browser event handling still need inspection against a pinned upstream source revision and the actual `ftewebgl.js` build. Synthetic keyboard/mouse events are not a verified input route; mouse-look often depends on pointer lock, which iOS Safari does not provide as desktop browsers do.

## Run locally

Serve this directory over HTTPS (or localhost), then open `index.html`. `Open official NZ:P` navigates the embedded frame to `https://nzp.gay/`. Fullscreen is feature-detected; iOS Safari may ignore it. The service worker caches only this small shell and intentionally leaves all cross-origin game content untouched.

## Deployment

Use Cloudflare Pages with this directory as the project root and no build command. Keep the deployment on HTTPS. Do not add game binaries or assets until the rights and upstream notices for each item have been confirmed. For a playable build, host the official launcher and authorized game files on the same origin, then add a maintained bridge inside the launcher/engine and verify the inputs below. Upstream changes should be pinned to a commit or release and tracked separately.

## Status and test report

Last inspected: 2026-11-19. No actual iPhone 15 or Safari device was available in this workspace. No claim of iOS compatibility is made.

| Requirement | Status |
|---|---|
| Shell responsive layout, landscape intent, safe-area CSS | Implemented; not device-tested |
| Official game boot and WASM loading | Not verified from this independent shell; frame points to upstream |
| Touch movement/look/fire/reload | Not integrated; controls disabled |
| Gamepad button/stick routing and reconnect | Detection events only; routing not integrated |
| Audio, suspend/resume, resolution controls | Not integrated |
| PWA shell manifest/service worker | Implemented; not installed/tested on iPhone |
| Cloudflare Pages configuration | Standard static deployment; no custom MIME overrides needed for shell |
| Automated acceptance tests | Not added; engine bridge absent, so meaningful gameplay tests cannot pass |

## Work required to reach acceptance

1. Pin and inspect the official WebGL source/build, including Vril/FTE browser input callbacks and actual default bindings.
2. Confirm redistribution terms for the web launcher and each binary/package; keep all notices and provide source obligations for GPL components.
3. Integrate a same-origin touch/gamepad adapter into the launch page or engine so actions call verified engine input APIs and release on interruption.
4. Test startup, gameplay, orientation, audio, background/resume, and gamepad on real iPhone 15 Safari; record device and iOS versions.
5. Set up the separate GitHub repository and Pages project under an authorized account. This workspace has no remote repository or deployment credentials.

### Automated Cloudflare Pages deployment

A GitHub Actions workflow is included at `.github/workflows/cloudflare-pages.yml`. After importing this independent project into a GitHub repository named `NZP-Mobile`, create a Cloudflare Pages project named `nzp-mobile-shell`, then add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Push to `main` or run the workflow manually. The workflow deploys only this shell; it does not mirror or bundle the game.

## Current handoff blocker

This workspace has no GitHub or Cloudflare account connection, no `gh` CLI, and cannot reach GitHub from the shell. The project is initialized as a local Git repository with its first changes staged, but no commit, remote repository, credentials, or public deployment have been created. Once GitHub and Cloudflare are connected to the environment, the repository can be pushed and the included workflow can publish the shell. A deployment would still be only a shell preview until an authorized same-origin game build and tested engine input bridge are available.
