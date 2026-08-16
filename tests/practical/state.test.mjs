import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppState, resetFlightState } from '../../game/state.mjs';

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
}

test('flight state starts safely on the ground', () => {
  const state = createAppState({ Vector3 });
  assert.deepEqual(state.flight.pos, new Vector3(0, 0.12, 0));
  assert.equal(state.flight.armed, false);
  assert.equal(state.flight.battery, 100);
});

test('reset clears all mutable flight state', () => {
  const { flight } = createAppState({ Vector3 });
  flight.pos.set(9, 20, -4); flight.vel.set(3, 2, 1); flight.armed = true; flight.rth = true;
  flight.autoLand = true; flight.battery = 8; flight.yaw = 2; flight.vPitch = 1; flight.vRoll = -1; flight.flightMode = 'RTH';
  resetFlightState(flight);
  assert.deepEqual(flight.pos, new Vector3(0, 0.12, 0));
  assert.deepEqual(flight.vel, new Vector3());
  assert.equal(flight.armed, false);
  assert.equal(flight.rth, false);
  assert.equal(flight.autoLand, false);
  assert.equal(flight.battery, 100);
  assert.equal(flight.flightMode, 'P-GPS');
});
