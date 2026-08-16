import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOrthoBounds, computePipViewport } from '../../game/camera-controller.mjs';

test('PiP converts top-origin CSS coordinates to bottom-origin WebGL coordinates', () => {
  assert.deepEqual(computePipViewport({ canvasWidth: 844, canvasHeight: 390, frameLeft: 632, frameTop: 50, frameWidth: 200, frameHeight: 150 }), { x: 632, y: 190, width: 200, height: 150 });
});

test('PiP is clamped inside a portrait canvas', () => {
  const viewport = computePipViewport({ canvasWidth: 390, canvasHeight: 844, frameLeft: 260, frameTop: 60, frameWidth: 180, frameHeight: 135 });
  assert.equal(viewport.x + viewport.width, 390);
  assert.ok(viewport.y >= 0);
});

test('orthographic bounds preserve aspect and contain the whole course', () => {
  for (const aspect of [4 / 3, 16 / 9, 3 / 4]) {
    const bounds = computeOrthoBounds(aspect);
    assert.ok(bounds.right - bounds.left >= 46);
    assert.ok(bounds.top - bounds.bottom >= 54);
    assert.ok(Math.abs((bounds.right - bounds.left) / (bounds.top - bounds.bottom) - aspect) < 1e-9);
  }
});
