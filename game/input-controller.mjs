import { FLIGHT_PARAMS } from './state.mjs';

const ZERO = Object.freeze({ lx: 0, ly: 0, rx: 0, ry: 0 });

export function normalizeHorizontalInput(rx, ry, deadzone = FLIGHT_PARAMS.rightStickDeadzone) {
  const magnitude = Math.hypot(rx, ry);
  if (magnitude <= deadzone) return { rx: 0, ry: 0 };
  const clampedMagnitude = Math.min(magnitude, 1);
  const scaledMagnitude = (clampedMagnitude - deadzone) / (1 - deadzone);
  const scale = scaledMagnitude / magnitude;
  return { rx: rx * scale, ry: ry * scale };
}

export function createInputController({ leftRing, leftThumb, rightRing, rightThumb, onArm, onRth, onCycleView }) {
  const input = { ...ZERO };
  const joystick = { ...ZERO };
  const keyboard = { ...ZERO };
  const keys = new Set();
  const cleanups = [];

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  function bindJoystick(ring, thumb, xKey, yKey) {
    let pointerId = null;
    const move = event => {
      if (event.pointerId !== pointerId) return;
      const rect = ring.getBoundingClientRect();
      const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.38);
      let dx = event.clientX - (rect.left + rect.width / 2);
      let dy = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      if (distance > radius) {
        dx = dx / distance * radius;
        dy = dy / distance * radius;
      }
      thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      joystick[xKey] = dx / radius;
      joystick[yKey] = -dy / radius;
    };
    const release = event => {
      if (pointerId === null || (event && event.pointerId !== pointerId)) return;
      pointerId = null;
      joystick[xKey] = 0;
      joystick[yKey] = 0;
      thumb.style.transform = 'translate(-50%,-50%)';
    };
    listen(ring, 'pointerdown', event => {
      event.preventDefault();
      if (pointerId !== null) return;
      pointerId = event.pointerId;
      ring.setPointerCapture?.(pointerId);
      move(event);
    });
    listen(ring, 'pointermove', move);
    listen(ring, 'pointerup', release);
    listen(ring, 'pointercancel', release);
    return () => {
      pointerId = null;
      joystick[xKey] = 0;
      joystick[yKey] = 0;
      thumb.style.transform = 'translate(-50%,-50%)';
    };
  }

  const releaseLeft = bindJoystick(leftRing, leftThumb, 'lx', 'ly');
  const releaseRight = bindJoystick(rightRing, rightThumb, 'rx', 'ry');

  listen(window, 'keydown', event => {
    keys.add(event.code);
    if (event.repeat) return;
    if (event.code === 'Space') { event.preventDefault(); onArm(); }
    if (event.code === 'KeyR') { event.preventDefault(); onRth(); }
    if (event.code === 'KeyV') onCycleView();
  });
  listen(window, 'keyup', event => keys.delete(event.code));
  listen(document, 'contextmenu', event => event.preventDefault());

  function axis(positive, negative, value, dt) {
    const speed = 3;
    if (keys.has(positive)) return Math.min(value + speed * dt, 1);
    if (keys.has(negative)) return Math.max(value - speed * dt, -1);
    return value * Math.exp(-speed * dt * 2);
  }

  function update(dt) {
    keyboard.ly = axis('ArrowUp', 'ArrowDown', keyboard.ly, dt);
    keyboard.lx = axis('ArrowRight', 'ArrowLeft', keyboard.lx, dt);
    keyboard.ry = axis('KeyW', 'KeyS', keyboard.ry, dt);
    keyboard.rx = axis('KeyD', 'KeyA', keyboard.rx, dt);
    for (const key of Object.keys(input)) {
      input[key] = Math.abs(joystick[key]) >= Math.abs(keyboard[key]) ? joystick[key] : keyboard[key];
    }
    const horizontal = normalizeHorizontalInput(input.rx, input.ry);
    input.rx = horizontal.rx;
    input.ry = horizontal.ry;
    return input;
  }

  function releaseAll() {
    keys.clear();
    Object.assign(input, ZERO);
    Object.assign(joystick, ZERO);
    Object.assign(keyboard, ZERO);
    releaseLeft();
    releaseRight();
    leftThumb.style.transform = 'translate(-50%,-50%)';
    rightThumb.style.transform = 'translate(-50%,-50%)';
  }

  function destroy() {
    releaseAll();
    cleanups.splice(0).forEach(cleanup => cleanup());
  }

  return { input, update, releaseAll, destroy };
}
