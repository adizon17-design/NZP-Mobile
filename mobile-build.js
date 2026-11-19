'use strict';
(() => {
  const upstream = 'https://nzp.gay/';
  const canvas = document.querySelector('#canvas');
  canvas.tabIndex = 0;
  const status = document.querySelector('#status');
  const controls = document.querySelector('#touch-controls');
  const welcome = document.querySelector('#welcome');
  const audioContexts = new Set();

  // Present one standard-mapped virtual controller to FTE's normal poller.
  // Its web build reads navigator.getGamepads() every frame, so touch controls
  // can use the same input path as a connected controller.
  const virtualButtons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0, lastframe: false }));
  const virtualPad = {
    id: 'NZ:P Touch Controller', index: 4, connected: true, timestamp: 0,
    mapping: 'standard', axes: [0, 0, 0, 0], buttons: virtualButtons,
    hapticActuators: [], vibrationActuator: null
  };
  const nativeGetGamepads = navigator.getGamepads;
  try {
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value() {
        let pads = [];
        try { if (nativeGetGamepads) pads = Array.from(nativeGetGamepads.call(navigator) || []); } catch (_) {}
        while (pads.length <= virtualPad.index) pads.push(null);
        pads[virtualPad.index] = virtualPad;
        return pads;
      }
    });
  } catch (_) {
    status.textContent = 'Virtual controller is unavailable in this browser.';
  }

  const buttonSources = new Map();
  function setPadButton(index, down, source) {
    let sources = buttonSources.get(index);
    if (!sources) buttonSources.set(index, sources = new Set());
    if (down) sources.add(source);
    else sources.delete(source);
    const pressed = sources.size > 0;
    const button = virtualButtons[index];
    button.pressed = button.touched = pressed;
    button.value = pressed ? 1 : 0;
    virtualPad.timestamp = performance.now();
    if (!pressed) buttonSources.delete(index);
  }

  // Track engine-created WebAudio contexts and unlock them from real taps.
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
    if (!audioContexts.size) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) { try { audioContexts.add(new Context()); } catch (_) {} }
    }
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

  document.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });

  const stick = document.querySelector('#stick');
  const stickNub = stick.querySelector('span');
  let stickPointer = null;
  const runButton = document.querySelector('.run');
  const runButtonIndex = Number(runButton.dataset.gamepadButton);
  let runToggled = false;
  function updateStick(event) {
    const box = stick.getBoundingClientRect();
    const radius = box.width * .34;
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const length = Math.hypot(dx, dy);
    const capped = Math.min(length, radius);
    const nx = length ? dx / length * capped : 0;
    const ny = length ? dy / length * capped : 0;
    stickNub.style.left = `calc(50% + ${nx}px)`;
    stickNub.style.top = `calc(50% + ${ny}px)`;

    // Radial dead zone and smooth analog axes replace the old competing
    // WASD+arrow-key events, which made movement and turning fight each other.
    const magnitude = Math.min(1, length / radius);
    const deadZone = .12;
    const strength = magnitude <= deadZone ? 0 : (magnitude - deadZone) / (1 - deadZone);
    const gain = strength / (magnitude || 1);
    virtualPad.axes[0] = dx / radius * gain;
    virtualPad.axes[1] = dy / radius * gain;
    virtualPad.timestamp = performance.now();
  }
  stick.addEventListener('pointerdown', event => {
    event.preventDefault(); unlockAudio();
    stickPointer = event.pointerId;
    stick.setPointerCapture(stickPointer);
    updateStick(event);
  });
  stick.addEventListener('pointermove', event => { if (event.pointerId === stickPointer) updateStick(event); });
  function resetStick(event) {
    if (event.pointerId !== stickPointer) return;
    stickPointer = null;
    virtualPad.axes[0] = virtualPad.axes[1] = 0;
    stickNub.style.left = stickNub.style.top = '50%';
    virtualPad.timestamp = performance.now();
  }
  stick.addEventListener('pointerup', resetStick);
  stick.addEventListener('pointercancel', resetStick);

  // The look pad moves the virtual right stick only. In FTE a TouchEvent
  // touchstart is a left mouse press, so forwarding taps there caused firing.
  const look = document.querySelector('#look');
  let lookPointer = null;
  let lastLook = null;
  let lookResetTimer = 0;
  let lookFrame = 0;
  let lookTargetX = 0;
  let lookTargetY = 0;
  let lookFrameTime = 0;
  function smoothLook(time) {
    if (lookPointer === null) { lookFrame = 0; return; }
    const dt = lookFrameTime ? Math.min(50, time - lookFrameTime) : 16;
    lookFrameTime = time;
    const blend = 1 - Math.exp(-dt / 24);
    virtualPad.axes[2] += (lookTargetX - virtualPad.axes[2]) * blend;
    virtualPad.axes[3] += (lookTargetY - virtualPad.axes[3]) * blend;
    virtualPad.timestamp = time;
    lookFrame = requestAnimationFrame(smoothLook);
  }
  function updateLook(event) {
    if (!lastLook) { lastLook = { x: event.clientX, y: event.clientY }; return; }
    const dx = event.clientX - lastLook.x;
    const dy = event.clientY - lastLook.y;
    lastLook = { x: event.clientX, y: event.clientY };
    // A stronger, smoothed virtual right stick makes short swipes register
    // quickly without sending TouchEvents to the engine's fire handler.
    lookTargetX = Math.max(-1, Math.min(1, dx / 10));
    lookTargetY = Math.max(-1, Math.min(1, dy / 10));
    virtualPad.timestamp = performance.now();
    clearTimeout(lookResetTimer);
    lookResetTimer = setTimeout(() => { lookTargetX = lookTargetY = 0; }, 75);
  }
  look.addEventListener('pointerdown', event => {
    event.preventDefault(); unlockAudio();
    lookPointer = event.pointerId;
    look.setPointerCapture(lookPointer);
    lastLook = { x: event.clientX, y: event.clientY };
    lookFrameTime = 0;
    if (!lookFrame) lookFrame = requestAnimationFrame(smoothLook);
  });
  look.addEventListener('pointermove', event => { if (event.pointerId === lookPointer) updateLook(event); });
  function resetLook(event) {
    if (event.pointerId !== lookPointer) return;
    lookPointer = null;
    lastLook = null;
    clearTimeout(lookResetTimer);
    if (lookFrame) cancelAnimationFrame(lookFrame);
    lookFrame = 0;
    lookTargetX = lookTargetY = 0;
    virtualPad.axes[2] = virtualPad.axes[3] = 0;
    virtualPad.timestamp = performance.now();
  }
  look.addEventListener('pointerup', resetLook);
  look.addEventListener('pointercancel', resetLook);

  // Catch touches on unused portions of the overlay too. Otherwise a missed
  // tap can pass through to the engine canvas, where touchstart means FIRE.
  controls.addEventListener('pointerdown', event => event.preventDefault(), { passive: false });
  controls.addEventListener('touchstart', event => event.preventDefault(), { passive: false });

  document.querySelectorAll('#buttons button, #menu-controls button').forEach(button => {
    const index = Number(button.dataset.gamepadButton);
    button.addEventListener('pointerdown', event => {
      event.preventDefault(); unlockAudio();
      button.setPointerCapture(event.pointerId);
      if (button.dataset.runToggle) {
        runToggled = !runToggled;
        setPadButton(runButtonIndex, runToggled, runButton);
        runButton.classList.toggle('is-held', runToggled);
        runButton.setAttribute('aria-pressed', String(runToggled));
        return;
      }
      if (button.dataset.adsToggle) {
        const aiming = virtualButtons[index].pressed;
        setPadButton(index, !aiming, button);
        button.classList.toggle('is-held', !aiming);
        button.setAttribute('aria-pressed', String(!aiming));
        return;
      }
      button.classList.add('is-held');
      setPadButton(index, true, button);
    });
    const release = event => {
      if (button.dataset.adsToggle || button.dataset.runToggle) return;
      button.classList.remove('is-held');
      setPadButton(index, false, button);
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
  });

  function releaseAll() {
    for (const index of buttonSources.keys()) {
      const button = virtualButtons[index];
      button.pressed = button.touched = false;
      button.value = 0;
    }
    virtualButtons.forEach(button => { button.pressed = button.touched = false; button.value = 0; });
    buttonSources.clear();
    runToggled = false;
    runButton.classList.remove('is-held');
    runButton.setAttribute('aria-pressed', 'false');
    document.querySelectorAll('#buttons .is-held').forEach(button => {
      button.classList.remove('is-held');
      if (button.dataset.adsToggle) button.setAttribute('aria-pressed', 'false');
    });
    virtualPad.axes.fill(0);
    clearTimeout(lookResetTimer);
    if (lookFrame) cancelAnimationFrame(lookFrame);
    lookFrame = 0;
    lookTargetX = lookTargetY = 0;
    lastLook = null;
    stickPointer = lookPointer = null;
    stickNub.style.left = stickNub.style.top = '50%';
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  window.addEventListener('blur', releaseAll);
  window.addEventListener('pagehide', releaseAll);

  document.querySelector('#fullscreen').addEventListener('click', async () => {
    try { await document.documentElement.requestFullscreen?.(); } catch (_) { status.textContent = 'Fullscreen is unavailable in this browser.'; }
  });
  document.querySelector('#sound').addEventListener('click', () => {
    unlockAudio();
    status.textContent = 'Sound enabled — tap again if audio was paused';
  });
  document.querySelector('#begin').addEventListener('click', () => {
    unlockAudio();
    const script = document.createElement('script');
    script.src = upstream + 'ftewebgl.js';
    script.onerror = () => { status.textContent = 'Could not load the official engine. Check nzp.gay connectivity and cross-site access.'; };
    document.head.append(script);
    status.textContent = 'Loading official game engine…';
  }, { once: true });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
