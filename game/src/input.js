// Neon Salvage — keyboard + mouse input.
// One job: track pressed keys and the mouse, nothing else.

import { W, H } from './config.js';

export function createInput() {
  return {
    keys: new Set(),
    mouseX: W / 2,
    mouseY: H / 2 - 120,
    mouseDown: false,
    pressed: new Set(), // edge-triggered keys, consumed once per step
  };
}

export function attachInput(input, canvas) {
  const onKeyDown = (e) => {
    if (
      e.code === 'ArrowUp' || e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
      e.code === 'Space'
    ) {
      e.preventDefault();
    }
    if (!input.keys.has(e.code)) input.pressed.add(e.code);
    input.keys.add(e.code);
  };
  const onKeyUp = (e) => {
    input.keys.delete(e.code);
  };
  const onMouseMove = (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = W / r.width;
    const sy = H / r.height;
    input.mouseX = (e.clientX - r.left) * sx;
    input.mouseY = (e.clientY - r.top) * sy;
  };
  const onMouseDown = (e) => {
    if (e.button === 0) input.mouseDown = true;
    onMouseMove(e);
  };
  const onMouseUp = (e) => {
    if (e.button === 0) input.mouseDown = false;
  };
  const onBlur = () => {
    input.keys.clear();
    input.mouseDown = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function keyDown(input, code) {
  return input.keys.has(code);
}

// True only on the step right after the key went down; call once per consumer.
export function keyPressed(input, code) {
  if (input.pressed.has(code)) {
    input.pressed.delete(code);
    return true;
  }
  return false;
}

export function endStepInput(input) {
  input.pressed.clear();
}
