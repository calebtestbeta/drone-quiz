export function computePipViewport({ canvasLeft = 0, canvasTop = 0, canvasWidth, canvasHeight, frameLeft, frameTop, frameWidth, frameHeight }) {
  const x = Math.max(0, Math.round(frameLeft - canvasLeft));
  const top = Math.max(0, Math.round(frameTop - canvasTop));
  const width = Math.max(1, Math.min(Math.round(frameWidth), canvasWidth - x));
  const height = Math.max(1, Math.min(Math.round(frameHeight), canvasHeight - top));
  return { x, y: Math.max(0, canvasHeight - top - height), width, height };
}

export function computeOrthoBounds(aspect, requiredWidth = 46, requiredHeight = 54) {
  const halfHeight = Math.max(requiredHeight / 2, requiredWidth / (2 * Math.max(aspect, 0.01)));
  const halfWidth = halfHeight * aspect;
  return { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight };
}

export function createCameraController({ THREE, renderer, scene, fpvPivot, flightState, pipFrame, minimapLayer }) {
  const followCamera = new THREE.PerspectiveCamera(60, 1, 0.05, 600);
  const fpvCamera = new THREE.PerspectiveCamera(80, 1, 0.05, 600);
  const topCamera = new THREE.PerspectiveCamera(45, 1, 0.05, 600);
  const candidateCamera = new THREE.PerspectiveCamera(55, 1, 0.05, 600);
  candidateCamera.position.set(0, 1.7, 12);
  const overviewCamera = new THREE.OrthographicCamera(-25, 25, 25, -25, 0.1, 250);
  overviewCamera.position.set(10, 100, -15);
  overviewCamera.up.set(0, 0, -1);
  overviewCamera.lookAt(10, 0, -15);
  overviewCamera.layers.enable(minimapLayer);

  const candidateTarget = new THREE.Vector3(10, 2, -15);
  const worldPosition = new THREE.Vector3();
  let mode = 'free';
  let view = 'third';
  let pipEnabled = false;

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    for (const camera of [followCamera, fpvCamera, topCamera, candidateCamera]) {
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    }
  }

  function update(dt) {
    const { pos, yaw, vPitch, vRoll } = flightState;
    const behind = new THREE.Vector3(Math.sin(yaw) * 7, 3.5, Math.cos(yaw) * 7);
    followCamera.position.lerp(pos.clone().add(behind), Math.min(1, dt * 6));
    followCamera.lookAt(pos.x, pos.y + 0.4, pos.z);
    fpvPivot.getWorldPosition(worldPosition);
    fpvCamera.position.copy(worldPosition);
    fpvCamera.rotation.set(vPitch * 0.5 - 0.05, yaw + Math.PI, vRoll * 0.4, 'YXZ');
    topCamera.position.set(pos.x, pos.y + 40, pos.z + 0.001);
    topCamera.lookAt(pos.x, pos.y, pos.z);
    const targetY = Math.max(pos.y, 0.6);
    candidateTarget.lerp(new THREE.Vector3(pos.x, targetY, pos.z), Math.min(1, dt * 4));
    candidateCamera.lookAt(candidateTarget);
  }

  function activeCamera() {
    if (mode !== 'free') return candidateCamera;
    if (view === 'fpv') return fpvCamera;
    if (view === 'top') return topCamera;
    return followCamera;
  }

  function render() {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
    renderer.clear(true, true, true);
    renderer.render(scene, activeCamera());
    if (!pipEnabled || !pipFrame || pipFrame.hidden) return;
    const canvasRect = canvas.getBoundingClientRect();
    const frameRect = pipFrame.getBoundingClientRect();
    const viewport = computePipViewport({
      canvasLeft: canvasRect.left, canvasTop: canvasRect.top, canvasWidth: canvasRect.width, canvasHeight: canvasRect.height,
      frameLeft: frameRect.left, frameTop: frameRect.top, frameWidth: frameRect.width, frameHeight: frameRect.height,
    });
    const bounds = computeOrthoBounds(viewport.width / viewport.height);
    Object.assign(overviewCamera, bounds);
    overviewCamera.updateProjectionMatrix();
    renderer.setScissorTest(true);
    renderer.setScissor(viewport.x, viewport.y, viewport.width, viewport.height);
    renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
    renderer.clearDepth();
    renderer.render(scene, overviewCamera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
  }

  function setMode(nextMode) {
    mode = nextMode;
    if (mode !== 'free') view = 'candidate';
    else if (!['third', 'fpv', 'top'].includes(view)) view = 'third';
  }

  function setView(nextView) {
    if (mode === 'free' && ['third', 'fpv', 'top'].includes(nextView)) view = nextView;
    return view;
  }

  function cycleFreeView() {
    if (mode !== 'free') return view;
    const views = ['third', 'fpv', 'top'];
    return setView(views[(views.indexOf(view) + 1) % views.length]);
  }

  function setPipEnabled(enabled) {
    pipEnabled = mode === 'basic' && Boolean(enabled);
    if (pipFrame) pipFrame.hidden = !pipEnabled;
    return pipEnabled;
  }

  function reset(nextMode) {
    mode = nextMode;
    view = nextMode === 'free' ? 'third' : 'candidate';
    candidateCamera.position.set(0, 1.7, 12);
    candidateTarget.set(10, 2, -15);
    setPipEnabled(nextMode === 'basic');
  }

  resize();
  return { resize, update, render, setMode, setView, cycleFreeView, setPipEnabled, reset, getView: () => view, isPipEnabled: () => pipEnabled };
}
