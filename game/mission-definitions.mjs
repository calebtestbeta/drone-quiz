function distanceXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

const target = (x, z) => ({ x, z });

export const BASIC_MARKERS = Object.freeze([
  { x: 0, z: -25, label: 'N', color: 0xffd700 },
  { x: 20, z: -25, label: 'E', color: 0x4488ff },
]);

export const EXAM_MARKERS = Object.freeze([
  { x: 0, z: -30, label: 'A', color: 0xffd700 },
  { x: 20, z: -30, label: 'B', color: 0x4488ff },
  { x: 20, z: 0, label: 'C', color: 0xff4444 },
]);

export const BASIC_TASKS = Object.freeze([
  {
    id: 'basic-takeoff', title: '起飛', desc: '解鎖馬達並上升至 5m 高度', checkDesc: '高度 ≥ 5m', timeout: 60, maxPoints: 1,
    evaluate: (_dt, state) => state.armed && state.pos.y - 0.12 >= 4.5 ? 'passed' : null,
  },
  {
    id: 'basic-hover', title: '定點懸停', desc: '保持懸停 8 秒，偏移範圍 ±3m', checkDesc: '懸停 8 秒', timeout: 30, maxPoints: 1,
    init: state => ({ timer: 0, start: { x: state.pos.x, z: state.pos.z } }),
    evaluate(dt, state, runtime) {
      runtime.timer = distanceXZ(state.pos, runtime.start) < 3 ? runtime.timer + dt : Math.max(0, runtime.timer - dt / 2);
      return runtime.timer >= 8 ? 'passed' : null;
    },
  },
  {
    id: 'basic-forward', title: '前進直線飛行', desc: '向北飛行至 25m 外的黃色標記樁', checkDesc: '抵達 25m 標記', timeout: 90, maxPoints: 1,
    evaluate: (_dt, state) => distanceXZ(state.pos, target(0, -25)) < 4 && state.pos.y > 1 ? 'passed' : null,
  },
  {
    id: 'basic-side', title: '側飛', desc: '向東側飛至 20m 外的藍色標記樁（不可偏航）', checkDesc: '抵達 20m 側飛標記', timeout: 90, maxPoints: 1,
    evaluate: (_dt, state) => distanceXZ(state.pos, target(20, -25)) < 4 ? 'passed' : null,
  },
  {
    id: 'basic-yaw', title: '偏航旋轉', desc: '順時針旋轉完整 360°', checkDesc: '累計旋轉 ≥ 360°', timeout: 60, maxPoints: 1,
    init: state => ({ lastYaw: state.yaw, totalRotation: 0 }),
    evaluate(_dt, state, runtime) {
      if (!state.armed) return null;
      let delta = state.yaw - runtime.lastYaw;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      runtime.totalRotation += Math.abs(delta);
      runtime.lastYaw = state.yaw;
      return runtime.totalRotation >= Math.PI * 2 ? 'passed' : null;
    },
  },
  {
    id: 'basic-landing', kind: 'landing', title: '精準降落', desc: '返回起飛點並降落（允許誤差 5m）', checkDesc: '降落在 5m 範圍內', timeout: 120, maxPoints: 1, landingRadius: 5,
  },
]);

function holdAt(targetPosition, radius, seconds) {
  return {
    init: () => ({ timer: 0 }),
    evaluate(dt, state, runtime) {
      const inside = distanceXZ(state.pos, targetPosition) < radius && state.pos.y - 0.12 > 1;
      runtime.timer = inside ? runtime.timer + dt : Math.max(0, runtime.timer - dt * 2);
      return runtime.timer >= seconds ? 'passed' : null;
    },
  };
}

export const EXAM_TASKS = Object.freeze([
  {
    id: 'exam-hover', title: '起飛懸停', desc: '垂直起飛至 5m，在半徑 3m 內懸停 10 秒', checkDesc: '懸停 10 秒（半徑 3m）', timeout: 90, maxPoints: 20,
    init: () => ({ timer: 0, start: null }),
    evaluate(dt, state, runtime) {
      if (state.pos.y - 0.12 < 4.5) return null;
      if (!runtime.start) runtime.start = { x: state.pos.x, z: state.pos.z };
      runtime.timer = distanceXZ(state.pos, runtime.start) < 3 ? runtime.timer + dt : Math.max(0, runtime.timer - dt);
      return runtime.timer >= 10 ? 'passed' : null;
    },
  },
  {
    id: 'exam-forward', title: '直線前進', desc: '向前直線飛行至 30m 外的標記樁（A 樁），到達後懸停 3 秒', checkDesc: '抵達 A 樁懸停 3 秒', timeout: 120, maxPoints: 20,
    ...holdAt(target(0, -30), 5, 3),
  },
  {
    id: 'exam-side', title: '側飛', desc: '向右側飛至 20m 外的標記樁（B 樁），到達後懸停 3 秒', checkDesc: '抵達 B 樁懸停 3 秒', timeout: 120, maxPoints: 20,
    ...holdAt(target(20, -30), 5, 3),
  },
  {
    id: 'exam-rectangle', title: '矩形航線', desc: '完成矩形航線：B 樁 → C 樁（向南 30m）→ 返回起飛點', checkDesc: '完成矩形並接近起飛點', timeout: 180, maxPoints: 20,
    init: () => ({ phase: 0 }),
    evaluate(_dt, state, runtime) {
      const altitudeOk = state.pos.y - 0.12 > 1;
      if (runtime.phase === 0 && distanceXZ(state.pos, target(20, 0)) < 5 && altitudeOk) runtime.phase = 1;
      return runtime.phase === 1 && distanceXZ(state.pos, target(0, 0)) < 8 && altitudeOk ? 'passed' : null;
    },
  },
  {
    id: 'exam-landing', kind: 'landing', title: '精準降落', desc: '在起飛點 H 標記上方降落（允許誤差 3m）', checkDesc: '降落誤差 < 3m', timeout: 120, maxPoints: 20, landingRadius: 3,
  },
]);

export function getMissionDefinition(mode) {
  if (mode === 'basic') return { tasks: BASIC_TASKS, markers: BASIC_MARKERS };
  if (mode === 'exam') return { tasks: EXAM_TASKS, markers: EXAM_MARKERS };
  return { tasks: [], markers: [] };
}
