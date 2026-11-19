/* Centralized movement input: capture events before the 3D canvas or scene handlers. */
(() => {
  const directions = {
    up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]
  };
  let activePointer = null;
  let repeatTimer = null;
  let lastMoveAt = 0;

  const stop = () => {
    if (repeatTimer !== null) clearInterval(repeatTimer);
    repeatTimer = null;
    activePointer = null;
  };

  const move = (dir) => {
    const delta = directions[dir];
    if (!delta || typeof window.tryMove !== 'function') return;
    const now = Date.now();
    if (now - lastMoveAt < 125) return;
    lastMoveAt = now;
    window.tryMove(delta[0], delta[1]);
  };

  document.addEventListener('pointerdown', (event) => {
    const button = event.target && event.target.closest
      ? event.target.closest('#dpad button[data-dir]') : null;
    if (!button) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    stop();
    activePointer = event.pointerId;
    lastMoveAt = 0;
    const dir = button.dataset.dir;
    move(dir);
    repeatTimer = setInterval(() => move(dir), 185);
  }, { capture: true, passive: false });

  const finish = (event) => {
    if (activePointer === null) return;
    if (event && event.pointerId !== undefined && event.pointerId !== activePointer) return;
    stop();
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
    window.addEventListener(type, finish, { capture: true });
  });
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });

  // Older iOS/Safari fallback when Pointer Events are unavailable.
  if (!window.PointerEvent) {
    document.addEventListener('touchstart', event => {
      const button = event.target && event.target.closest
        ? event.target.closest('#dpad button[data-dir]') : null;
      if (!button) return;
      event.preventDefault();
      stop();
      lastMoveAt = 0;
      const dir = button.dataset.dir;
      move(dir);
      repeatTimer = setInterval(() => move(dir), 185);
    }, { capture: true, passive: false });
    ['touchend', 'touchcancel'].forEach(type => {
      window.addEventListener(type, stop, { capture: true, passive: true });
    });
  }

  // Keep keyboard controls working even if focus is on a non-input game surface.
  document.addEventListener('keydown', event => {
    if (event.repeat && !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(event.key)) return;
    if (document.querySelector('.modal.show')) return;
    if (window.battle && window.battle.active) return;
    const map = {
      ArrowUp:[0,-1], w:[0,-1], W:[0,-1],
      ArrowDown:[0,1], s:[0,1], S:[0,1],
      ArrowLeft:[-1,0], a:[-1,0], A:[-1,0],
      ArrowRight:[1,0], d:[1,0], D:[1,0]
    };
    const delta = map[event.key];
    if (!delta) return;
    event.preventDefault();
    if (typeof window.tryMove === 'function') window.tryMove(delta[0], delta[1]);
  }, { capture: true });
})();
