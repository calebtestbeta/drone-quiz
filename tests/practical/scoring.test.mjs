import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskResult, summarizeResults } from '../../game/scoring.mjs';

const task = (id, maxPoints = 20) => ({ id, title: id, maxPoints });

function examResults(passes) {
  return Array.from({ length: 5 }, (_, index) => createTaskResult(task(`t${index}`), index < passes ? 'passed' : 'failed', index < passes ? 'criteria_met' : 'timeout', 10));
}

test('exam score is the direct sum of task details', () => {
  const summary = summarizeResults('exam', examResults(3));
  assert.equal(summary.score, 60);
  assert.equal(summary.maxScore, 100);
  assert.equal(summary.passed, true);
  assert.equal(summary.score, summary.tasks.reduce((sum, item) => sum + item.points, 0));
});

test('two passed exam tasks do not pass', () => {
  const summary = summarizeResults('exam', examResults(2));
  assert.equal(summary.score, 40);
  assert.equal(summary.passed, false);
});

test('failed tasks always award zero rather than negative or consolation points', () => {
  assert.equal(createTaskResult(task('failed'), 'failed', 'timeout', 12).points, 0);
});
