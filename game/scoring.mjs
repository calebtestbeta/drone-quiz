export const SCORE_RULES = Object.freeze({
  basic: { taskPoints: 1, passScore: 6 },
  exam: { taskPoints: 20, passScore: 60 },
});

export function createTaskResult(task, status, reason, durationSec) {
  const passed = status === 'passed';
  return {
    taskId: task.id,
    title: task.title,
    status,
    reason,
    points: passed ? task.maxPoints : 0,
    maxPoints: task.maxPoints,
    durationSec: Math.round(durationSec * 10) / 10,
  };
}

export function summarizeResults(mode, results) {
  const score = results.reduce((sum, item) => sum + item.points, 0);
  const maxScore = results.reduce((sum, item) => sum + item.maxPoints, 0);
  const passedTasks = results.filter(item => item.status === 'passed').length;
  const passScore = SCORE_RULES[mode]?.passScore ?? maxScore;
  return {
    mode,
    score,
    maxScore,
    passedTasks,
    totalTasks: results.length,
    passed: mode === 'exam' ? score >= passScore : passedTasks === results.length,
    passScore,
    tasks: results.map(item => ({ ...item })),
  };
}
