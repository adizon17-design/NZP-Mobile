'use strict';
const OFFICIAL_GAME = 'https://nzp.gay/';
const frame = document.querySelector('#game');
const start = document.querySelector('#start');
start.addEventListener('click', () => {
  frame.src = OFFICIAL_GAME;
  document.querySelector('#notice').innerHTML = '<b>Official game opened</b><p>This cross-origin frame does not expose its engine input to the mobile shell. Touch controls are intentionally disabled until the official launcher and engine are integrated on the same origin with a verified input bridge.</p>';
  start.disabled = true;
});
document.querySelector('#fullscreen').addEventListener('click', async () => {
  try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); }
  catch (error) { console.info('Fullscreen unavailable in this browser.', error); }
});
// Gamepad connection is detected for diagnosis only: routing requires a verified engine bridge.
window.addEventListener('gamepadconnected', e => console.info('Controller detected; engine routing is not configured.', e.gamepad.id));
window.addEventListener('gamepaddisconnected', e => console.info('Controller disconnected.', e.gamepad.id));
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(err => console.info('Offline cache unavailable.', err)));
}
