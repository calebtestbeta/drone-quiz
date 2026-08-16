import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlightController } from '../../game/flight-controller.mjs';

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  addScaledVector(vector, scale) { this.x += vector.x * scale; this.y += vector.y * scale; this.z += vector.z * scale; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  normalize() { const length = this.length() || 1; this.x /= length; this.y /= length; this.z /= length; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
}
const THREE = { Vector3, MathUtils: { clamp: (n, min, max) => Math.max(min, Math.min(max, n)), lerp: (a, b, t) => a + (b - a) * Math.min(1, t) } };

function state() {
  return { pos: new Vector3(0, .12, 0), vel: new Vector3(), homePos: new Vector3(), yaw: 0, vPitch: 0, vRoll: 0, battery: 100, armed: false, rth: false, autoLand: false, flightMode: 'P-GPS' };
}

test('arm, flight update, disarm and RTH use one flight state', () => {
  const flightState = state();
  const controller = createFlightController({ THREE, state: flightState });
  assert.equal(controller.toggleArm(), true);
  controller.update(.1, { lx: 0, ly: 1, rx: 0, ry: 0 });
  assert.equal(flightState.armed, true);
  assert.ok(flightState.vel.y > 0);
  assert.equal(controller.triggerRth(), true);
  assert.equal(flightState.flightMode, 'RTH');
  assert.equal(controller.toggleArm(), false);
});

test('landing emits once and returns to safe state', () => {
  const flightState = state();
  let landed = 0;
  const controller = createFlightController({ THREE, state: flightState, onLanded: () => { landed += 1; } });
  flightState.armed = true;
  controller.land();
  assert.equal(landed, 1);
  assert.equal(flightState.armed, false);
  assert.equal(flightState.pos.y, .12);
});

function simulate({ rx = 0, ry = 0, yaw = 0, seconds = 1, fps = 60, initialVelocity } = {}) {
  const flightState = state();
  flightState.armed = true;
  flightState.yaw = yaw;
  if (initialVelocity) flightState.vel.set(initialVelocity.x, 0, initialVelocity.z);
  const controller = createFlightController({ THREE, state: flightState });
  for (let frame = 0; frame < seconds * fps; frame += 1) controller.update(1 / fps, { lx: 0, ly: 0, rx, ry });
  return flightState;
}

test('all eight body-relative directions have correct world signs at yaw zero', () => {
  const cases = [
    { rx: 0, ry: 1, x: 0, z: -1 }, { rx: 0, ry: -1, x: 0, z: 1 },
    { rx: 1, ry: 0, x: 1, z: 0 }, { rx: -1, ry: 0, x: -1, z: 0 },
    { rx: 1, ry: 1, x: 1, z: -1 }, { rx: -1, ry: 1, x: -1, z: -1 },
    { rx: 1, ry: -1, x: 1, z: 1 }, { rx: -1, ry: -1, x: -1, z: 1 },
  ];
  for (const expected of cases) {
    const result = simulate({ rx: expected.rx, ry: expected.ry, seconds: .1 });
    if (expected.x) assert.equal(Math.sign(result.vel.x), expected.x);
    else assert.ok(Math.abs(result.vel.x) < 1e-9);
    if (expected.z) assert.equal(Math.sign(result.vel.z), expected.z);
    else assert.ok(Math.abs(result.vel.z) < 1e-9);
  }
});

test('diagonal commands never exceed the configured five meter target speed', () => {
  const result = simulate({ rx: 1, ry: -1, seconds: 3 });
  assert.ok(Math.hypot(result.vel.x, result.vel.z) <= 5 + 1e-6);
});

test('body-relative directions rotate correctly with yaw', () => {
  const yaw90Forward = simulate({ ry: 1, yaw: Math.PI / 2, seconds: .1 });
  const yaw180Forward = simulate({ ry: 1, yaw: Math.PI, seconds: .1 });
  const yaw270Forward = simulate({ ry: 1, yaw: Math.PI * 1.5, seconds: .1 });
  assert.equal(Math.sign(yaw90Forward.vel.x), -1);
  assert.equal(Math.sign(yaw180Forward.vel.z), 1);
  assert.equal(Math.sign(yaw270Forward.vel.x), 1);
});

test('visual pitch and roll agree with commanded movement', () => {
  assert.ok(simulate({ ry: 1, seconds: .1 }).vPitch < 0, 'forward must pitch nose down');
  assert.ok(simulate({ ry: -1, seconds: .1 }).vPitch > 0, 'backward must pitch nose up');
  assert.ok(simulate({ rx: 1, seconds: .1 }).vRoll < 0, 'right must lower the right side');
  assert.ok(simulate({ rx: -1, seconds: .1 }).vRoll > 0, 'left must lower the left side');
});

test('full reverse crosses zero within 0.35 seconds', () => {
  const result = simulate({ ry: -1, seconds: .35, initialVelocity: { x: 0, z: -5 } });
  assert.ok(result.vel.z > 0);
});

test('centered stick brakes below 0.1 m/s within one second', () => {
  const result = simulate({ seconds: 1, initialVelocity: { x: 3, z: -4 } });
  assert.ok(Math.hypot(result.vel.x, result.vel.z) < .1);
});

test('horizontal response is stable across common frame rates', () => {
  const results = [30, 60, 120].map(fps => simulate({ rx: Math.SQRT1_2, ry: -Math.SQRT1_2, fps }));
  const reference = results[1];
  for (const result of results) {
    assert.ok(Math.abs(result.vel.x - reference.vel.x) < .02);
    assert.ok(Math.abs(result.vel.z - reference.vel.z) < .02);
    assert.ok(Math.abs(result.pos.x - reference.pos.x) < .08);
    assert.ok(Math.abs(result.pos.z - reference.pos.z) < .08);
  }
});
