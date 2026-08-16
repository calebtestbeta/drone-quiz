import test from 'node:test';
import assert from 'node:assert/strict';
import { createMissionEngine } from '../../game/mission-engine.mjs';

const state = () => ({ pos: { x: 0, y: 0.12, z: 0 }, homePos: { x: 0, y: 0, z: 0 }, armed: false, yaw: 0 });

test('exam timeout records zero and continues through every task', () => {
  let completed;
  const engine = createMissionEngine({ onComplete: summary => { completed = summary; } });
  const flight = state();
  engine.start('exam', flight);
  for (const timeout of [90, 120, 120, 180, 120]) engine.update(timeout, flight);
  assert.equal(engine.snapshot().complete, true);
  assert.equal(completed.tasks.length, 5);
  assert.equal(completed.score, 0);
  assert.ok(completed.tasks.every(item => item.reason === 'timeout'));
});

test('out-of-range landing fails only the landing task and completes consistently', () => {
  let completed;
  const engine = createMissionEngine({ onComplete: summary => { completed = summary; } });
  const flight = state();
  engine.start('exam', flight);
  for (const timeout of [90, 120, 120, 180]) engine.update(timeout, flight);
  flight.pos.x = 10;
  engine.onLanded(flight);
  assert.equal(completed.tasks.at(-1).reason, 'landing_out_of_range');
  assert.equal(completed.tasks.at(-1).points, 0);
});

test('completion callback is emitted once', () => {
  let calls = 0;
  const engine = createMissionEngine({ onComplete: () => { calls += 1; } });
  const flight = state();
  engine.start('basic', flight);
  for (const timeout of [60, 30, 90, 90, 60, 120]) engine.update(timeout, flight);
  engine.update(999, flight);
  engine.onLanded(flight);
  assert.equal(calls, 1);
});
