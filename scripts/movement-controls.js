/* Reliable movement input for iOS/iPadOS and desktop browsers. */
(() => {
  const directions = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  let activePointer = null;
  let repeatTimer = null;
  let lastPointerDownAt = 0;
  let lastMoveAt = 0;

  function findDirectionButton(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
      if (node && node.matches && node.matches('#dpad button[data-dir]')) return node;
    }
    const target = event.target;
    return target && target.closest ? target.closest('#dpad button[data-dir]') : null;
  }

  function stop() {
    if (repeatTimer !== null) clearInterval(repeatTimer);
    repeatTimer = null;
    activePointer = null;
  }

  function move(dir, force) {
    const delta = directions[dir];
    if (!delta || typeof window.tryMove !== 'function') return false;
    const now = Date.now();
    if (!force && now - lastMoveAt < 120) return false;
    lastMoveAt = now;
    window.tryMove(delta[0], delta[1]);
    return true;
  }

  function begin(dir, pointerId) {
    stop();
    activePointer = pointerId == null ? 'touch' : pointerId;
    lastMoveAt = 0;
    move(dir, true);
    repeatTimer = setInterval(() => move(dir, false), 185);
  }

  document.addEventListener('pointerdown', event => {
    const button = findDirectionButton(event);
    if (!button || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    lastPointerDownAt = Date.now();
    begin(button.dataset.dir, event.pointerId);
  }, {capture:true,passive:false});

  // Click is an independent fallback for browsers that dispatch click but fail
  // to deliver Pointer Events to the overlaid game controls.
  document.addEventListener('click', event => {
    const button = findDirectionButton(event);
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() - lastPointerDownAt < 650) return;
    move(button.dataset.dir, true);
  }, {capture:true});

  function finish(event) {
    if (activePointer === null) return;
    if (event && event.pointerId !== undefined && activePointer !== event.pointerId) return;
    stop();
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type =>
    window.addEventListener(type, finish, {capture:true})
  );
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  // Touch fallback also runs on iOS versions that expose PointerEvent but
  // occasionally fail to route pointer input through transformed layers.
  document.addEventListener('touchstart', event => {
    const button = findDirectionButton(event);
    if (!button) return;
    if (Date.now() - lastPointerDownAt < 100) return;
    event.preventDefault();
    event.stopPropagation();
    begin(button.dataset.dir, 'touch');
  }, {capture:true,passive:false});
  ['touchend','touchcancel'].forEach(type =>
    window.addEventListener(type, finish, {capture:true,passive:true})
  );

  document.addEventListener('keydown', event => {
    if (document.querySelector('.modal.show')) return;
    if (window.battle && window.battle.active) return;
    const map = {
      ArrowUp:[0,-1],w:[0,-1],W:[0,-1],
      ArrowDown:[0,1],s:[0,1],S:[0,1],
      ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],
      ArrowRight:[1,0],d:[1,0],D:[1,0]
    };
    const delta = map[event.key];
    if (!delta) return;
    event.preventDefault();
    if (typeof window.tryMove === 'function') window.tryMove(delta[0],delta[1]);
  }, {capture:true});
})();
