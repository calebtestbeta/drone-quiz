import { createAppState, resetFlightState } from './state.mjs';
import { createInputController } from './input-controller.mjs';
import { createFlightController } from './flight-controller.mjs';
import { createGameScene } from './scene.mjs';
import { createCameraController } from './camera-controller.mjs';
import { createUiController } from './ui-controller.mjs';
import { createMissionEngine } from './mission-engine.mjs';
import { getMissionDefinition } from './mission-definitions.mjs';
import { createSessionStore } from './session-store.mjs';

const THREE = globalThis.THREE;
if (!THREE) throw new Error('Three.js 載入失敗');

const appState = createAppState(THREE);
const ui = createUiController();
const gameScene = createGameScene({ THREE, canvas: document.getElementById('c') });
const sessions = createSessionStore();
let flight;

const mission = createMissionEngine({
  onTaskChanged: snapshot => ui.renderTask(snapshot),
  onTaskResult: result => ui.showTaskResult(result),
  onComplete: summary => {
    appState.paused = true;
    ui.setPaused(false);
    sessions.add({
      id: `${Date.now()}-${appState.mode}`,
      completedAt: new Date().toISOString(),
      ...summary,
    });
    ui.showComplete(summary);
  },
});

flight = createFlightController({ THREE, state: appState.flight, onLanded: state => mission.onLanded(state) });
const camera = createCameraController({
  THREE,
  renderer: gameScene.renderer,
  scene: gameScene.scene,
  fpvPivot: gameScene.fpvPivot,
  flightState: appState.flight,
  pipFrame: ui.elements.pip,
  minimapLayer: gameScene.minimapLayer,
});

function renderModeUi() {
  ui.renderMode(appState.mode, camera.getView(), camera.isPipEnabled());
}

function resetRun(mode) {
  appState.mode = mode;
  appState.paused = false;
  input.releaseAll();
  resetFlightState(appState.flight);
  flight.reset();
  ui.reset();
  camera.reset(mode);
  appState.view = camera.getView();
  appState.pipEnabled = camera.isPipEnabled();
  gameScene.setMissionMarkers(getMissionDefinition(mode).markers);
  mission.start(mode, appState.flight);
  ui.showMenu(false);
  ui.setPaused(false);
  renderModeUi();
  ui.renderFlight(appState.flight, 0);
  lastTime = performance.now();
}

function selectMode(mode) {
  if (!['free', 'basic', 'exam'].includes(mode)) return;
  resetRun(mode);
}

function openMenu() {
  appState.paused = true;
  input.releaseAll();
  resetFlightState(appState.flight);
  flight.reset();
  gameScene.clearMissionMarkers();
  ui.reset();
  ui.setPaused(false);
  ui.showMenu(true);
  ui.renderFlight(appState.flight, 0);
}

function restart() {
  if (['basic', 'exam'].includes(appState.mode)) resetRun(appState.mode);
}

function toggleArm() {
  if (appState.paused || appState.mode === 'idle') return;
  flight.toggleArm();
  ui.renderFlight(appState.flight, 0);
}

function triggerRth() {
  if (appState.paused || appState.mode === 'idle') return;
  flight.triggerRth();
  ui.renderFlight(appState.flight, 0);
}

function setView(view) {
  appState.view = camera.setView(view);
  renderModeUi();
}

function cycleView() {
  appState.view = camera.cycleFreeView();
  renderModeUi();
}

function togglePip() {
  if (appState.mode !== 'basic') return;
  appState.pipEnabled = camera.setPipEnabled(!camera.isPipEnabled());
  renderModeUi();
}

function pause() {
  if (appState.paused || appState.mode === 'idle') return;
  appState.paused = true;
  input.releaseAll();
  ui.setPaused(true);
}

function resume() {
  if (appState.mode === 'idle') return;
  appState.paused = false;
  input.releaseAll();
  ui.setPaused(false);
  lastTime = performance.now();
}

const input = createInputController({
  ...ui.inputElements,
  onArm: toggleArm,
  onRth: triggerRth,
  onCycleView: cycleView,
});

ui.bindCommands({ selectMode, restart, openMenu, toggleArm, triggerRth, setView, togglePip, resume });
window.addEventListener('resize', camera.resize);
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (!appState.paused) {
    const mergedInput = input.update(dt);
    flight.update(dt, mergedInput);
    mission.update(dt, appState.flight);
  }
  gameScene.syncFlightState(appState.flight, dt);
  camera.update(dt);
  ui.renderFlight(appState.flight, now);
  camera.render();
}

ui.showMenu(true);
ui.setPaused(false);
ui.renderFlight(appState.flight, 0);
requestAnimationFrame(animate);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
