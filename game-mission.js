// ════════════════════════════════════════════════════════════════
// game-mission.js — 任務／模式系統（全域變數，無 export）
// 依賴全域變數：THREE, scene, S, homePad
// 必須在 game-scene.js 之後、game.html 內聯腳本之後載入
// ════════════════════════════════════════════════════════════════

// ── 任務狀態 ─────────────────────────────────────────────────────
let missionMode = 'free';     // 'free' | 'basic' | 'exam'
let missionTasks = [];
let missionTaskIdx = 0;
let missionTaskData = {};
let missionScore = 0;
let missionComplete = false;
let missionTaskInited = false;
let missionTimeoutTimer = 0;

// 每個任務的得分紀錄（考試模式用）
let examScoreBreakdown = [];

// ── 航點標記管理 ──────────────────────────────────────────────────
let waypointMarkers = [];

function addWaypointMarker(x, z, label, color) {
  const g = new THREE.Group();

  // 旗竿
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 6, 8),
    new THREE.MeshLambertMaterial({ color: 0xaaaaaa })
  );
  pole.position.y = 3;
  g.add(pole);

  // 頂端球體
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshLambertMaterial({ color })
  );
  ball.position.y = 6.5;
  g.add(ball);

  // 地面圓圈
  const ring = new THREE.Mesh(
    new THREE.CircleGeometry(2, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);

  g.position.set(x, 0, z);
  scene.add(g);
  waypointMarkers.push(g);
  return g;
}

function clearWaypointMarkers() {
  waypointMarkers.forEach(m => scene.remove(m));
  waypointMarkers = [];
}

function initTaskMarkers() {
  clearWaypointMarkers();
  if (missionMode === 'basic') {
    addWaypointMarker(0,  -25, 'N', 0xffd700);  // 任務3：向北25m 黃色
    addWaypointMarker(20, -25, 'E', 0x4488ff);  // 任務4：向東20m 藍色
  } else if (missionMode === 'exam') {
    addWaypointMarker(0,  -30, 'A', 0xffd700);  // A 樁：黃色
    addWaypointMarker(20, -30, 'B', 0x4488ff);  // B 樁：藍色
    addWaypointMarker(20,   0, 'C', 0xff4444);  // C 樁：紅色
  }
}

// ── 輔助：XZ 平面距離 ────────────────────────────────────────────
function xzDist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

// ── 基本操作練習任務（6 個）────────────────────────────────────────
const BASIC_TASKS = [
  {
    title: '起飛',
    desc: '解鎖馬達並上升至 5m 高度',
    checkDesc: '高度 ≥ 5m',
    timeout: 60,
    init(td) {
      td.done = false;
    },
    update(dt, S, td) {
      const alt = S.pos.y - 0.12;
      if (S.armed && alt >= 4.5) return 'pass';
      return null;
    }
  },
  {
    title: '定點懸停',
    desc: '保持懸停 8 秒，偏移範圍 ±3m',
    checkDesc: '懸停 8 秒',
    timeout: 30,
    init(td, S) {
      td.timer = 0;
      td.startPos = S.pos.clone();
    },
    update(dt, S, td) {
      const dist = xzDist(S.pos, td.startPos);
      if (dist < 3) {
        td.timer += dt;
      } else {
        td.timer = Math.max(0, td.timer - dt / 2);
      }
      if (td.timer >= 8) return 'pass';
      return null;
    }
  },
  {
    title: '前進直線飛行',
    desc: '向北飛行至 25m 外的黃色標記樁',
    checkDesc: '抵達 25m 標記',
    timeout: 90,
    init(td) {
      td.targetPos = new THREE.Vector3(0, 0, -25);
    },
    update(dt, S, td) {
      if (xzDist(S.pos, td.targetPos) < 4 && S.pos.y > 1) return 'pass';
      return null;
    }
  },
  {
    title: '側飛',
    desc: '向東側飛至 20m 外的藍色標記樁（不可偏航）',
    checkDesc: '抵達 20m 側飛標記',
    timeout: 90,
    init(td) {
      td.targetPos = new THREE.Vector3(20, 0, -25);
    },
    update(dt, S, td) {
      if (xzDist(S.pos, td.targetPos) < 4) return 'pass';
      return null;
    }
  },
  {
    title: '偏航旋轉',
    desc: '順時針旋轉完整 360°',
    checkDesc: '累計旋轉 ≥ 360°',
    timeout: 60,
    init(td, S) {
      td.lastYaw = S.yaw;
      td.totalRot = 0;
    },
    update(dt, S, td) {
      if (S.armed) {
        let delta = S.yaw - td.lastYaw;
        // 正規化到 [-PI, PI]
        while (delta >  Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        td.totalRot += Math.abs(delta);
        td.lastYaw = S.yaw;
        if (td.totalRot >= Math.PI * 2) return 'pass';
      }
      return null;
    }
  },
  {
    title: '精準降落',
    desc: '返回起飛點並降落（允許誤差 5m）',
    checkDesc: '降落在 5m 範圍內',
    timeout: 120,
    init(td) {
      td.landed = false;
    },
    update(dt, S, td) {
      // 由 onDroneLanded() 觸發檢查
      return null;
    }
  }
];

// ── 考試練習任務（5 個，台灣民航局多旋翼術科）────────────────────────
const EXAM_TASKS = [
  {
    title: '起飛懸停',
    desc: '垂直起飛至 5m，在半徑 3m 內懸停 10 秒',
    checkDesc: '懸停 10 秒（半徑 3m）',
    timeout: 90,
    init(td) {
      td.timer = 0;
      td.startPos = null;
    },
    update(dt, S, td) {
      const alt = S.pos.y - 0.12;
      if (alt >= 4.5) {
        if (!td.startPos) td.startPos = S.pos.clone();
        const dist = xzDist(S.pos, td.startPos);
        if (dist < 3) {
          td.timer += dt;
        } else {
          td.timer = Math.max(0, td.timer - dt);
        }
        if (td.timer >= 10) return 'pass';
      }
      return null;
    }
  },
  {
    title: '直線前進',
    desc: '向前直線飛行至 30m 外的標記樁（A 樁），到達後懸停 3 秒',
    checkDesc: '抵達 A 樁懸停 3 秒',
    timeout: 120,
    init(td) {
      td.arrivedTimer = 0;
      td.arrived = false;
      td.targetPos = new THREE.Vector3(0, 0, -30);
    },
    update(dt, S, td) {
      const alt = S.pos.y - 0.12;
      if (xzDist(S.pos, td.targetPos) < 5 && alt > 1) {
        td.arrivedTimer += dt;
        if (td.arrivedTimer >= 3) return 'pass';
      } else {
        td.arrivedTimer = Math.max(0, td.arrivedTimer - dt * 2);
      }
      return null;
    }
  },
  {
    title: '側飛',
    desc: '向右側飛至 20m 外的標記樁（B 樁），到達後懸停 3 秒',
    checkDesc: '抵達 B 樁懸停 3 秒',
    timeout: 120,
    init(td) {
      td.arrivedTimer = 0;
      td.targetPos = new THREE.Vector3(20, 0, -30);
    },
    update(dt, S, td) {
      const alt = S.pos.y - 0.12;
      if (xzDist(S.pos, td.targetPos) < 5 && alt > 1) {
        td.arrivedTimer += dt;
        if (td.arrivedTimer >= 3) return 'pass';
      } else {
        td.arrivedTimer = Math.max(0, td.arrivedTimer - dt * 2);
      }
      return null;
    }
  },
  {
    title: '矩形航線',
    desc: '完成矩形航線：B 樁 → C 樁（向南 30m）→ 返回起飛點',
    checkDesc: '完成矩形並接近起飛點',
    timeout: 180,
    init(td) {
      td.phase = 0; // 0=飛往C, 1=飛回home
      td.posC = new THREE.Vector3(20, 0, 0);
      td.posHome = new THREE.Vector3(0, 0, 0);
    },
    update(dt, S, td) {
      const alt = S.pos.y - 0.12;
      if (td.phase === 0) {
        if (xzDist(S.pos, td.posC) < 5 && alt > 1) {
          td.phase = 1;
        }
      } else {
        if (xzDist(S.pos, td.posHome) < 8 && alt > 1) return 'pass';
      }
      return null;
    }
  },
  {
    title: '精準降落',
    desc: '在起飛點 H 標記上方降落（允許誤差 3m）',
    checkDesc: '降落誤差 < 3m',
    timeout: 120,
    init(td) {
      td.landed = false;
    },
    update(dt, S, td) {
      // 由 onDroneLanded() 觸發
      return null;
    }
  }
];

// ── 任務面板 DOM 更新 ─────────────────────────────────────────────
function updateTaskPanel() {
  const panel = document.getElementById('task-panel');
  if (!panel) return;

  if (missionMode === 'free' || missionComplete) {
    panel.classList.remove('active');
    return;
  }

  const task = missionTasks[missionTaskIdx];
  if (!task) {
    panel.classList.remove('active');
    return;
  }

  panel.classList.add('active');

  const numEl   = document.getElementById('task-num');
  const titleEl = document.getElementById('task-title');
  const descEl  = document.getElementById('task-desc');
  const checkEl = document.getElementById('task-check-desc');
  const fillEl  = document.getElementById('task-timeout-fill');

  if (numEl)   numEl.textContent   = `${missionTaskIdx + 1} / ${missionTasks.length}`;
  if (titleEl) titleEl.textContent = task.title;
  if (descEl)  descEl.textContent  = task.desc;
  if (checkEl) checkEl.textContent = '✓ ' + task.checkDesc;

  // 倒數計時條
  if (fillEl && task.timeout > 0) {
    const pct = Math.max(0, Math.min(1, 1 - missionTimeoutTimer / task.timeout));
    fillEl.style.width = (pct * 100) + '%';
    fillEl.style.background = pct < 0.3 ? '#f87171' : pct < 0.6 ? '#fbbf24' : '#22d3ee';
  } else if (fillEl) {
    fillEl.style.width = '100%';
  }
}

function showTaskResult(passed, taskTitle) {
  const el = document.getElementById('task-result');
  if (!el) return;
  el.textContent = passed ? `✓ ${taskTitle} 完成！` : `✗ ${taskTitle} 失敗`;
  el.className = passed ? 'pass' : 'fail';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 2000);
}

function showMissionComplete(score, totalTasks) {
  const overlay = document.getElementById('mission-complete');
  if (!overlay) return;

  const titleEl = document.getElementById('mc-title');
  const scoreEl = document.getElementById('mc-score');
  const breakEl = document.getElementById('mc-breakdown');

  const passed = (missionMode === 'exam') ? score >= 60 : true;

  if (titleEl) titleEl.textContent = passed ? '任務完成！' : '任務結束';
  if (titleEl) titleEl.style.color = passed ? '#4ade80' : '#f87171';

  if (missionMode === 'exam') {
    if (scoreEl) {
      scoreEl.textContent = score + ' 分';
      scoreEl.style.color = passed ? '#4ade80' : '#f87171';
    }
    if (breakEl) {
      const lines = examScoreBreakdown.map((b, i) =>
        `${i + 1}. ${b.title}：${b.pts >= 0 ? '+' : ''}${b.pts} 分`
      );
      lines.push('');
      lines.push(passed ? '恭喜通過！（及格線：60 分）' : '未達及格標準（60 分）');
      breakEl.innerHTML = lines.join('<br>');
    }
  } else {
    if (scoreEl) { scoreEl.textContent = '完成 ' + totalTasks + ' 項任務'; scoreEl.style.color = '#4ade80'; }
    if (breakEl) breakEl.textContent = '所有基本操作任務完成！';
  }

  overlay.style.display = 'flex';
  document.getElementById('task-panel') && document.getElementById('task-panel').classList.remove('active');
}

// ── 下一個任務 ────────────────────────────────────────────────────
function advanceTask(passed) {
  const task = missionTasks[missionTaskIdx];
  showTaskResult(passed, task ? task.title : '');

  if (missionMode === 'exam') {
    const pts = passed ? 20 : 10;  // 失敗扣半，超時扣10
    examScoreBreakdown.push({ title: task ? task.title : '', pts: passed ? 20 : -10 });
    missionScore += pts;
  }

  missionTaskIdx++;
  missionTaskInited = false;
  missionTimeoutTimer = 0;
  missionTaskData = {};

  if (missionTaskIdx >= missionTasks.length) {
    // 全部完成
    missionComplete = true;
    const finalScore = missionMode === 'exam'
      ? examScoreBreakdown.reduce((s, b) => s + (b.pts > 0 ? b.pts : 0), 0)
      : 0;
    setTimeout(() => showMissionComplete(finalScore, missionTasks.length), 500);
  } else {
    updateTaskPanel();
  }
}

// ── 考試失敗（不繼續）────────────────────────────────────────────
function failExam(task) {
  showTaskResult(false, task ? task.title : '');
  examScoreBreakdown.push({ title: task ? task.title : '', pts: -10 });
  missionComplete = true;
  const finalScore = examScoreBreakdown.reduce((s, b) => s + (b.pts > 0 ? b.pts : 0), 0);
  setTimeout(() => showMissionComplete(finalScore, missionTasks.length), 500);
}

// ── 降落事件鉤子（由 game.html 的 land() 呼叫）────────────────────
function onDroneLanded() {
  if (missionComplete || missionMode === 'free') return;

  const task = missionTasks[missionTaskIdx];
  if (!task) return;

  // 檢查是否為降落任務
  if (task.title === '精準降落') {
    const homePos = S.homePos || new THREE.Vector3(0, 0, 0);
    const dist = xzDist(S.pos, homePos);
    const threshold = (missionMode === 'exam') ? 3 : 5;
    if (dist < threshold) {
      advanceTask(true);
    } else {
      if (missionMode === 'exam') {
        failExam(task);
      } else {
        advanceTask(false);
      }
    }
  }
}
window.onDroneLanded = onDroneLanded;

// ── 重置任務 ──────────────────────────────────────────────────────
function resetMission() {
  missionTaskIdx = 0;
  missionScore = 0;
  missionComplete = false;
  missionTaskInited = false;
  missionTimeoutTimer = 0;
  missionTaskData = {};
  examScoreBreakdown = [];

  // 隱藏任務完成覆蓋層
  const mc = document.getElementById('mission-complete');
  if (mc) mc.style.display = 'none';

  clearWaypointMarkers();

  if (missionMode !== 'free') {
    initTaskMarkers();
  }

  updateTaskPanel();
}
window.resetMission = resetMission;

// ── 選擇模式 ──────────────────────────────────────────────────────
function selectMode(mode) {
  missionMode = mode;

  const overlay = document.getElementById('menu-overlay');
  if (overlay) overlay.style.display = 'none';

  // 設定任務清單
  if (mode === 'basic') {
    missionTasks = BASIC_TASKS.map(t => Object.assign({}, t));
  } else if (mode === 'exam') {
    missionTasks = EXAM_TASKS.map(t => Object.assign({}, t));
  } else {
    missionTasks = [];
  }

  // 更新 hint 提示文字
  const hintEl = document.getElementById('hint');
  if (hintEl) {
    if (mode === 'free') {
      hintEl.innerHTML = '<h2>🚁 ALIGN M460</h2><p>按下方 ARM 或 Space 鍵解鎖馬達</p><p>左搖桿 ↑↓ 油門 &nbsp;|&nbsp; 左搖桿 ←→ 偏航</p><p>右搖桿 前後左右 飛行</p>';
    } else if (mode === 'basic') {
      hintEl.innerHTML = '<h2>📚 基本操作練習</h2><p>按 ARM 解鎖馬達，開始第一個任務</p>';
    } else if (mode === 'exam') {
      hintEl.innerHTML = '<h2>🎯 考試練習模式</h2><p>按 ARM 解鎖馬達開始術科考試模擬</p><p>共 5 項任務，滿分 100 分，及格 60 分</p>';
    }
  }

  resetMission();
}
window.selectMode = selectMode;

// ── 主更新迴圈（每幀由 animate() 呼叫）──────────────────────────
function updateMission(dt) {
  if (missionMode === 'free' || missionComplete) return;

  const task = missionTasks[missionTaskIdx];
  if (!task) {
    // 所有任務完成
    if (!missionComplete) {
      missionComplete = true;
      const finalScore = missionMode === 'exam'
        ? examScoreBreakdown.reduce((s, b) => s + (b.pts > 0 ? b.pts : 0), 0)
        : 0;
      setTimeout(() => showMissionComplete(finalScore, missionTasks.length), 300);
    }
    return;
  }

  // 初始化當前任務
  if (!missionTaskInited) {
    missionTaskData = {};
    if (task.init) task.init(missionTaskData, S);
    missionTaskInited = true;
    missionTimeoutTimer = 0;
  }

  // 倒數計時
  if (task.timeout > 0) {
    missionTimeoutTimer += dt;
    if (missionTimeoutTimer >= task.timeout) {
      // 超時
      if (missionMode === 'exam') {
        failExam(task);
      } else {
        advanceTask(false);
      }
      return;
    }
  }

  // 執行任務檢查
  const result = task.update ? task.update(dt, S, missionTaskData) : null;
  if (result === 'pass') {
    advanceTask(true);
  } else if (result === 'fail') {
    if (missionMode === 'exam') {
      failExam(task);
    } else {
      advanceTask(false);
    }
  }

  updateTaskPanel();
}
window.updateMission = updateMission;
