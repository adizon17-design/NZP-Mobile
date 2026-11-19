'use strict';
(() => {
  const upstream = 'https://nzp.gay/';
  const canvas = document.querySelector('#canvas');
  canvas.tabIndex = 0;
  const status = document.querySelector('#status');
  const controls = document.querySelector('#touch-controls');
  const welcome = document.querySelector('#welcome');
  const heldKeys = new Set();
  const heldMouseButtons = new Set();
  const fingers = new Map();
  const audioContexts = new Set();
  let nextFinger = 100;
  let lastAimPoint = { x: 0, y: 0 };

  // iOS can suspend WebAudio when the engine creates its audio context after
  // the Start tap. Track engine contexts and resume them on each real touch.
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const NativeContext = window[name];
    if (!NativeContext || NativeContext.__nzpTracked) continue;
    const TrackedContext = new Proxy(NativeContext, {
      construct(target, args) {
        const context = Reflect.construct(target, args, target);
        audioContexts.add(context);
        return context;
      }
    });
    Object.defineProperty(TrackedContext, '__nzpTracked', { value: true });
    try { window[name] = TrackedContext; } catch (_) {}
  }

  function unlockAudio() {
    for (const context of audioContexts) {
      if (context.state === 'suspended') context.resume().catch(() => {});
    }
  }

  window.Module = {
    canvas,
    files: {
      'default.fmf': upstream + 'default.fmf',
      'nzp/game.pk3': upstream + 'nzp/game.pk3',
      'nzp/progs.pk3': upstream + 'nzp/progs.pk3'
    },
    locateFile: file => new URL(file, upstream).href,
    print: message => console.log(message),
    printErr: message => console.warn(message),
    setStatus: message => { status.textContent = message || 'Game ready'; },
    totalDependencies: 0,
    monitorRunDependencies(left) {
      this.totalDependencies = Math.max(this.totalDependencies, left);
      this.setStatus(left ? `Preparing game (${this.totalDependencies - left}/${this.totalDependencies})` : 'Game ready');
    },
    postRun: [() => { welcome.hidden = true; controls.hidden = false; }]
  };

  function sendKey(code, down) {
    if (down ? heldKeys.has(code) : !heldKeys.has(code)) return;
    down ? heldKeys.add(code) : heldKeys.delete(code);
    const key = ({ KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', KeyE: 'e', KeyR: 'r', Space: ' ', Enter: 'Enter', Escape: 'Escape', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight' })[code] || '';
    const keyCode = ({ KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, KeyE: 69, KeyR: 82, Space: 32, Enter: 13, Escape: 27, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 })[code] || 0;
    canvas.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
      key, code, keyCode, which: keyCode,
      bubbles: true, cancelable: true
    }));
  }
  function sendMouseButton(button, down, x = lastAimPoint.x, y = lastAimPoint.y) {
    if (down ? heldMouseButtons.has(button) : !heldMouseButtons.has(button)) return;
    if (down) canvas.focus({ preventScroll: true });
    down ? heldMouseButtons.add(button) : heldMouseButtons.delete(button);
    const buttonBit = value => value === 2 ? 2 : value === 1 ? 4 : 1;
    const bits = [...heldMouseButtons].reduce((mask, value) => mask | buttonBit(value), 0);
    canvas.dispatchEvent(new MouseEvent(down ? 'mousedown' : 'mouseup', {
      button, buttons: bits, clientX: x, clientY: y,
      screenX: x, screenY: y, bubbles: true, cancelable: true, view: window
    }));
  }

  function touchPoint(id, x, y) {
    const TouchType = window.Touch;
    if (!TouchType || !window.TouchEvent) throw new Error('This browser cannot construct the game input events required by this preview.');
    return new TouchType({ identifier: id, target: canvas, clientX: x, clientY: y, pageX: x + scrollX, pageY: y + scrollY, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 });
  }
  function sendTouch(type, id, x, y) {
    const point = touchPoint(id, x, y);
    const active = [...fingers.values()].map(f => touchPoint(f.id, f.x, f.y));
    const changed = [point];
    const touches = type === 'touchend' || type === 'touchcancel' ? active.filter(t => t.identifier !== id) : [...active.filter(t => t.identifier !== id), point];
    canvas.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches, targetTouches: touches, changedTouches: changed }));
  }
  function startFinger(pointerId, x, y) {
    const id = nextFinger++;
    fingers.set(pointerId, { id, x, y });
    sendTouch('touchstart', id, x, y);
    return id;
  }
  function moveFinger(pointerId, x, y) {
    const f = fingers.get(pointerId);
    if (!f) return;
    f.x = x; f.y = y;
    sendTouch('touchmove', f.id, x, y);
  }
  function endFinger(pointerId, x, y) {
    const f = fingers.get(pointerId);
    if (!f) return;
    f.x = x; f.y = y;
    sendTouch('touchend', f.id, x, y);
    fingers.delete(pointerId);
  }

  const stick = document.querySelector('#stick');
  const stickNub = stick.querySelector('span');
  let stickPointer = null;
  function updateStick(event) {
    const box = stick.getBoundingClientRect();
    const radius = box.width * .34;
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, radius / length);
    const nx = dx * scale, ny = dy * scale;
    stickNub.style.left = `calc(50% + ${nx}px)`;
    stickNub.style.top = `calc(50% + ${ny}px)`;
    const dead = box.width * .17;
    sendKey('KeyW', ny < -dead); sendKey('KeyS', ny > dead);
    sendKey('KeyA', nx < -dead); sendKey('KeyD', nx > dead);
    sendKey('ArrowUp', ny < -dead); sendKey('ArrowDown', ny > dead);
    sendKey('ArrowLeft', nx < -dead); sendKey('ArrowRight', nx > dead);
  }
  stick.addEventListener('pointerdown', event => {
    event.preventDefault(); stickPointer = event.pointerId; stick.setPointerCapture(stickPointer); updateStick(event);
  });
  stick.addEventListener('pointermove', event => { if (event.pointerId === stickPointer) updateStick(event); });
  function resetStick(event) {
    if (event.pointerId !== stickPointer) return;
    stickPointer = null;
    for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) sendKey(key, false);
    stickNub.style.left = '50%'; stickNub.style.top = '50%';
  }
  stick.addEventListener('pointerup', resetStick);
  stick.addEventListener('pointercancel', resetStick);

  const look = document.querySelector('#look');
  const lookPointers = new Set();
  document.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
  look.addEventListener('pointerdown', event => {
    event.preventDefault(); look.setPointerCapture(event.pointerId); lookPointers.add(event.pointerId);
    lastAimPoint = { x: event.clientX, y: event.clientY };
    try { startFinger(event.pointerId, event.clientX, event.clientY); }
    catch (error) { status.textContent = error.message; }
  });
  look.addEventListener('pointermove', event => {
    if (!lookPointers.has(event.pointerId)) return;
    lastAimPoint = { x: event.clientX, y: event.clientY };
    moveFinger(event.pointerId, event.clientX, event.clientY);
  });
  function endLook(event) {
    if (!lookPointers.delete(event.pointerId)) return;
    endFinger(event.pointerId, event.clientX, event.clientY);
  }
  look.addEventListener('pointerup', endLook);
  look.addEventListener('pointercancel', endLook);

  document.querySelectorAll('#buttons button').forEach(button => {
    let finger = null;
    button.addEventListener('pointerdown', event => {
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      unlockAudio();
      button.classList.add('is-held');
      if (button.dataset.fire) sendMouseButton(0, true, event.clientX, event.clientY);
      else if (button.dataset.mouse) sendMouseButton(Number(button.dataset.mouse), true, event.clientX, event.clientY);
      else sendKey(button.dataset.key, true);
    });
    const release = event => {
      button.classList.remove('is-held');
      if (button.dataset.fire) sendMouseButton(0, false, event.clientX, event.clientY);
      else if (button.dataset.mouse) sendMouseButton(Number(button.dataset.mouse), false, event.clientX, event.clientY);
      else if (button.dataset.key) sendKey(button.dataset.key, false);
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
  });

  function releaseAll() {
    for (const code of [...heldKeys]) sendKey(code, false);
    for (const button of [...heldMouseButtons]) sendMouseButton(button, false);
    for (const pointerId of [...fingers.keys()]) endFinger(pointerId, 0, 0);
    document.querySelectorAll('#buttons .is-held').forEach(button => button.classList.remove('is-held'));
    if (stickPointer !== null) { stickPointer = null; stickNub.style.left = '50%'; stickNub.style.top = '50%'; }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  window.addEventListener('blur', releaseAll);
  window.addEventListener('pagehide', releaseAll);
  document.querySelector('#fullscreen').addEventListener('click', async () => {
    try { await document.documentElement.requestFullscreen?.(); } catch (_) { status.textContent = 'Fullscreen is unavailable in this browser.'; }
  });
  document.querySelector('#sound').addEventListener('click', () => {
    unlockAudio();
    status.textContent = 'Audio resumed where supported';
  });
  document.querySelector('#begin').addEventListener('click', () => {
    unlockAudio();
    const script = document.createElement('script');
    script.src = upstream + 'ftewebgl.js';
    script.onerror = () => { status.textContent = 'Could not load the official engine. Check nzp.gay connectivity and cross-site access.'; };
    document.head.append(script);
    status.textContent = 'Loading official game engine…';
  }, { once: true });
})();
