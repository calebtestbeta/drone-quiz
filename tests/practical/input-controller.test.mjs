import test from 'node:test';
import assert from 'node:assert/strict';
import { createInputController, normalizeHorizontalInput } from '../../game/input-controller.mjs';

class FakeTarget {
  constructor() { this.handlers = new Map(); this.style = {}; }
  addEventListener(type, handler) { if (!this.handlers.has(type)) this.handlers.set(type, new Set()); this.handlers.get(type).add(handler); }
  removeEventListener(type, handler) { this.handlers.get(type)?.delete(handler); }
  emit(type, event = {}) { for (const handler of this.handlers.get(type) ?? []) handler({ preventDefault() {}, ...event }); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 120, height: 120 }; }
  setPointerCapture() {}
}

test('releaseAll clears held keyboard and joystick values', () => {
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  globalThis.window = new FakeTarget();
  globalThis.document = new FakeTarget();
  const leftRing = new FakeTarget(), leftThumb = new FakeTarget(), rightRing = new FakeTarget(), rightThumb = new FakeTarget();
  const controller = createInputController({ leftRing, leftThumb, rightRing, rightThumb, onArm() {}, onRth() {}, onCycleView() {} });
  window.emit('keydown', { code: 'KeyW' });
  assert.ok(controller.update(.1).ry > 0);
  controller.releaseAll();
  assert.deepEqual(controller.input, { lx: 0, ly: 0, rx: 0, ry: 0 });
  controller.destroy();
  globalThis.window = oldWindow;
  globalThis.document = oldDocument;
});

test('horizontal deadzone removes drift and rescales continuously', () => {
  assert.deepEqual(normalizeHorizontalInput(.04, -.04), { rx: 0, ry: 0 });
  const outside = normalizeHorizontalInput(.1, 0);
  assert.ok(outside.rx > 0 && outside.rx < .1);
  assert.equal(outside.ry, 0);
});

test('keyboard and virtual-stick diagonals are normalized to the same unit circle', () => {
  const keyboard = normalizeHorizontalInput(1, -1);
  const joystick = normalizeHorizontalInput(Math.SQRT1_2, -Math.SQRT1_2);
  assert.ok(Math.abs(Math.hypot(keyboard.rx, keyboard.ry) - 1) < 1e-9);
  assert.ok(Math.abs(keyboard.rx - joystick.rx) < 1e-9);
  assert.ok(Math.abs(keyboard.ry - joystick.ry) < 1e-9);
});

test('right-stick pointer maps lower-right to right-back', () => {
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  globalThis.window = new FakeTarget();
  globalThis.document = new FakeTarget();
  const leftRing = new FakeTarget(), leftThumb = new FakeTarget(), rightRing = new FakeTarget(), rightThumb = new FakeTarget();
  const controller = createInputController({ leftRing, leftThumb, rightRing, rightThumb, onArm() {}, onRth() {}, onCycleView() {} });
  rightRing.emit('pointerdown', { pointerId: 7, clientX: 120, clientY: 120 });
  const input = controller.update(1 / 60);
  assert.ok(input.rx > 0);
  assert.ok(input.ry < 0);
  assert.ok(Math.abs(Math.hypot(input.rx, input.ry) - 1) < 1e-9);
  controller.destroy();
  globalThis.window = oldWindow;
  globalThis.document = oldDocument;
});
