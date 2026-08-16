import { FLIGHT_PARAMS } from './state.mjs';

const byId = id => document.getElementById(id);

export function createUiController() {
  const elements = {
    menu: byId('menu-overlay'), complete: byId('mission-complete'), pause: byId('pause-overlay'), pip: byId('pip-frame'),
    arm: byId('ba'), rth: byId('br'), hint: byId('hint'), modeBadge: byId('mode-badge'),
    viewToggle: byId('vt'), pipToggle: byId('pip-toggle'), taskPanel: byId('task-panel'),
    taskNum: byId('task-num'), taskTitle: byId('task-title'), taskDesc: byId('task-desc'), taskCheck: byId('task-check-desc'), taskFill: byId('task-timeout-fill'),
    taskResult: byId('task-result'), score: byId('mc-score'), completeTitle: byId('mc-title'), breakdown: byId('mc-breakdown'),
    height: byId('hv'), distance: byId('dv'), verticalSpeed: byId('vsv'), horizontalSpeed: byId('hsv'), battery: byId('bat'),
    altitude: byId('alt-val'), heading: byId('hdg-txt'), compass: byId('cd'), horizon: byId('aw'), roll: byId('roll-ind'), vsi: byId('vsi-bar'), warnings: byId('warns'),
  };
  const cleanups = [];
  let resultTimer = null;
  let lastHud = 0;

  function listen(target, type, handler) {
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  }

  function bindCommands(commands) {
    document.querySelectorAll('[data-mode]').forEach(button => listen(button, 'click', () => commands.selectMode(button.dataset.mode)));
    document.querySelectorAll('[data-view]').forEach(button => listen(button, 'click', () => commands.setView(button.dataset.view)));
    listen(elements.arm, 'click', commands.toggleArm);
    listen(elements.rth, 'click', commands.triggerRth);
    listen(byId('restart-button'), 'click', commands.restart);
    listen(byId('menu-button'), 'click', commands.openMenu);
    listen(byId('resume-button'), 'click', commands.resume);
    listen(elements.pipToggle, 'click', commands.togglePip);
  }

  function showMenu(show) {
    elements.menu.hidden = !show;
  }

  function setPaused(paused) {
    elements.pause.hidden = !paused;
  }

  function renderMode(mode, view, pipEnabled) {
    elements.viewToggle.hidden = mode !== 'free';
    elements.pipToggle.hidden = mode !== 'basic';
    elements.pipToggle.textContent = pipEnabled ? '俯視圖：開' : '俯視圖：關';
    elements.pipToggle.setAttribute('aria-pressed', String(pipEnabled));
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    if (mode === 'free') elements.hint.innerHTML = '<h2>🚁 ALIGN M460</h2><p>按 ARM 或 Space 鍵解鎖馬達</p><p>左桿控制油門／偏航，右桿控制前後／左右</p>';
    if (mode === 'basic') elements.hint.innerHTML = '<h2>📚 基本操作練習</h2><p>固定考生站位視角，按 ARM 開始第一項任務</p>';
    if (mode === 'exam') elements.hint.innerHTML = '<h2>🎯 考試練習模式</h2><p>固定考生站位視角，共 5 項、滿分 100、60 分及格</p>';
  }

  function renderFlight(state, now = performance.now()) {
    elements.arm.textContent = state.armed ? 'DISARM' : 'ARM';
    elements.arm.classList.toggle('armed', state.armed);
    elements.rth.disabled = !state.armed;
    elements.hint.hidden = state.armed;
    elements.modeBadge.textContent = state.flightMode;
    elements.modeBadge.classList.toggle('rth', state.flightMode === 'RTH');
    if (now - lastHud < 80) return;
    lastHud = now;
    const altitude = Math.max(0, state.pos.y - 0.12);
    const distance = state.pos.distanceTo(state.homePos);
    const horizontalSpeed = Math.hypot(state.vel.x, state.vel.z);
    const battery = Math.round(Math.max(0, state.battery));
    elements.height.textContent = altitude.toFixed(1);
    elements.distance.textContent = distance.toFixed(0);
    elements.verticalSpeed.textContent = state.vel.y.toFixed(1);
    elements.horizontalSpeed.textContent = horizontalSpeed.toFixed(1);
    elements.battery.textContent = `${battery}%`;
    elements.battery.style.color = battery < 15 ? '#f87171' : battery < 30 ? '#fbbf24' : '#fff';
    elements.altitude.textContent = altitude.toFixed(0);
    elements.altitude.style.color = altitude > 120 ? '#f87171' : altitude > 100 ? '#fbbf24' : '#fff';
    const rollDegrees = state.vRoll * 180 / Math.PI;
    elements.horizon.setAttribute('transform', `rotate(${rollDegrees.toFixed(2)}) translate(0,${(-state.vPitch * 55).toFixed(1)})`);
    elements.roll.setAttribute('cx', (Math.sin(state.vRoll) * 38).toFixed(2));
    elements.roll.setAttribute('cy', (-Math.cos(state.vRoll) * 38).toFixed(2));
    const heading = ((state.yaw * 180 / Math.PI) % 360 + 360) % 360;
    elements.compass.setAttribute('transform', `rotate(${(-heading).toFixed(1)})`);
    elements.heading.textContent = `${Math.round(heading).toString().padStart(3, '0')}°`;
    const verticalFraction = Math.max(-1, Math.min(1, state.vel.y / FLIGHT_PARAMS.maxVV));
    elements.vsi.style.bottom = verticalFraction >= 0 ? '50%' : 'auto';
    elements.vsi.style.top = verticalFraction >= 0 ? 'auto' : '50%';
    elements.vsi.style.height = `${Math.abs(verticalFraction) * 31}px`;
    elements.vsi.style.background = verticalFraction >= 0 ? '#4ade80' : '#fb923c';
    const warnings = [];
    if (battery <= 0) warnings.push('🔴 電量耗盡 — 緊急降落');
    else if (battery <= 15) warnings.push('⚡ 電量嚴重不足 — 強制返航');
    else if (battery <= 30) warnings.push(`⚡ 低電量警告 (${battery}%)`);
    if (altitude > 120) warnings.push('🚫 超過法定高度上限 120m');
    else if (altitude > 100) warnings.push('⚠️ 接近高度上限 120m');
    elements.warnings.replaceChildren(...warnings.map(text => {
      const warning = document.createElement('div');
      warning.className = `wb ${text.startsWith('🔴') || text.startsWith('🚫') ? 'wr' : 'wy'}`;
      warning.textContent = text;
      return warning;
    }));
  }

  function renderTask(snapshot) {
    const { task, index, total, taskElapsed, complete } = snapshot;
    elements.taskPanel.classList.toggle('active', Boolean(task) && !complete && snapshot.mode !== 'free');
    if (!task) return;
    elements.taskNum.textContent = `${index + 1} / ${total}`;
    elements.taskTitle.textContent = task.title;
    elements.taskDesc.textContent = task.desc;
    elements.taskCheck.textContent = `✓ ${task.checkDesc}`;
    const fraction = task.timeout > 0 ? Math.max(0, Math.min(1, 1 - taskElapsed / task.timeout)) : 1;
    elements.taskFill.style.width = `${fraction * 100}%`;
    elements.taskFill.style.background = fraction < 0.3 ? '#f87171' : fraction < 0.6 ? '#fbbf24' : '#22d3ee';
  }

  function showTaskResult(result) {
    clearTimeout(resultTimer);
    const passed = result.status === 'passed';
    elements.taskResult.textContent = passed ? `✓ ${result.title} 完成！` : `✗ ${result.title} 未完成`;
    elements.taskResult.className = passed ? 'pass' : 'fail';
    elements.taskResult.hidden = false;
    resultTimer = setTimeout(() => { elements.taskResult.hidden = true; }, 1800);
  }

  function showComplete(summary) {
    elements.complete.hidden = false;
    elements.completeTitle.textContent = summary.passed ? '任務完成！' : '任務結束';
    elements.completeTitle.style.color = summary.passed ? '#4ade80' : '#f87171';
    elements.score.textContent = summary.mode === 'exam' ? `${summary.score} 分` : `完成 ${summary.passedTasks} / ${summary.totalTasks} 項`;
    elements.score.style.color = summary.passed ? '#4ade80' : '#f87171';
    const fragment = document.createDocumentFragment();
    summary.tasks.forEach((task, index) => {
      const line = document.createElement('div');
      line.textContent = `${index + 1}. ${task.title}：${task.points} / ${task.maxPoints}`;
      fragment.append(line);
    });
    const verdict = document.createElement('div');
    verdict.className = 'verdict';
    verdict.textContent = summary.mode === 'exam' ? (summary.passed ? '通過（及格線 60 分）' : '未達 60 分') : (summary.passed ? '所有項目完成' : '仍有項目需要練習');
    fragment.append(verdict);
    elements.breakdown.replaceChildren(fragment);
  }

  function reset() {
    clearTimeout(resultTimer);
    elements.complete.hidden = true;
    elements.taskResult.hidden = true;
    elements.taskPanel.classList.remove('active');
    elements.warnings.replaceChildren();
    lastHud = 0;
  }

  function destroy() {
    cleanups.splice(0).forEach(cleanup => cleanup());
    clearTimeout(resultTimer);
  }

  return {
    elements, bindCommands, showMenu, setPaused, renderMode, renderFlight, renderTask,
    showTaskResult, showComplete, reset, destroy,
    inputElements: { leftRing: byId('jlr'), leftThumb: byId('jlt'), rightRing: byId('jrr'), rightThumb: byId('jrt') },
  };
}
