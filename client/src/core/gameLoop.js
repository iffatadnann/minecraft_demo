// Runs update() and render() every frame.
// update() receives delta: the seconds passed since the last frame.
// Returns a stop() function that ends the loop.
export function startGameLoop(update, render) {
  let last = performance.now();
  let frameId = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    // Clamp delta so a long pause (e.g. switching tabs) doesn't cause a big jump
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;

    update(delta);
    render();
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);

  return function stop() {
    running = false;
    cancelAnimationFrame(frameId);
  };
}