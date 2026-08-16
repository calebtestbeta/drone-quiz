import { createTaskResult, summarizeResults } from './scoring.mjs';
import { getMissionDefinition } from './mission-definitions.mjs';

export function createMissionEngine({ onTaskChanged = () => {}, onTaskResult = () => {}, onComplete = () => {} } = {}) {
  let mode = 'free';
  let tasks = [];
  let index = 0;
  let runtime = {};
  let taskElapsed = 0;
  let totalElapsed = 0;
  let results = [];
  let complete = false;

  const currentTask = () => tasks[index] ?? null;

  function notifyTask() {
    onTaskChanged({ mode, task: currentTask(), index, total: tasks.length, taskElapsed, totalElapsed, complete });
  }

  function start(nextMode, state) {
    mode = nextMode;
    tasks = [...getMissionDefinition(mode).tasks];
    index = 0;
    runtime = tasks[0]?.init?.(state) ?? {};
    taskElapsed = 0;
    totalElapsed = 0;
    results = [];
    complete = false;
    notifyTask();
  }

  function finishIfNeeded() {
    if (index < tasks.length || complete) return false;
    complete = true;
    const summary = { ...summarizeResults(mode, results), durationSec: Math.round(totalElapsed * 10) / 10 };
    onComplete(summary);
    notifyTask();
    return true;
  }

  function resolve(status, reason, state) {
    const task = currentTask();
    if (!task || complete) return;
    const result = createTaskResult(task, status, reason, taskElapsed);
    results.push(result);
    onTaskResult(result);
    index += 1;
    taskElapsed = 0;
    runtime = currentTask()?.init?.(state) ?? {};
    if (!finishIfNeeded()) notifyTask();
  }

  function update(dt, state) {
    const task = currentTask();
    if (!task || complete || mode === 'free') return;
    taskElapsed += dt;
    totalElapsed += dt;
    if (task.timeout > 0 && taskElapsed >= task.timeout) {
      resolve('failed', 'timeout', state);
      return;
    }
    const status = task.evaluate?.(dt, state, runtime);
    if (status === 'passed') resolve('passed', 'criteria_met', state);
    else if (status === 'failed') resolve('failed', 'criteria_failed', state);
    else notifyTask();
  }

  function onLanded(state) {
    const task = currentTask();
    if (!task || task.kind !== 'landing' || complete) return;
    const distance = Math.hypot(state.pos.x - state.homePos.x, state.pos.z - state.homePos.z);
    resolve(distance < task.landingRadius ? 'passed' : 'failed', distance < task.landingRadius ? 'landing_in_range' : 'landing_out_of_range', state);
  }

  function reset(state) {
    start(mode, state);
  }

  function snapshot() {
    return { mode, index, total: tasks.length, task: currentTask(), taskElapsed, totalElapsed, results: results.map(item => ({ ...item })), complete };
  }

  return { start, reset, update, onLanded, snapshot };
}
