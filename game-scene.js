// ════════════════════════════════════════════════════════════════
// game-scene.js — Three.js 場景設定（全域變數，無 export）
// 依賴：three.min.js 需在此檔案之前載入
// ════════════════════════════════════════════════════════════════

// ── Renderer ────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ── Scene ────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec8f0);
scene.fog = new THREE.FogExp2(0xaed8f0, 0.005);

// ── Cameras ──────────────────────────────────────────────────────
const camMain = new THREE.PerspectiveCamera(60, 1, 0.05, 600);
const camFPV  = new THREE.PerspectiveCamera(80, 1, 0.05, 600);
const camTop  = new THREE.PerspectiveCamera(45, 1, 0.05, 600);

let activeView = 'third'; // 'third' | 'fpv' | 'top'

function onResize() {
  const W = window.innerWidth, H = window.innerHeight;
  renderer.setSize(W, H);
  [camMain, camFPV, camTop].forEach(c => { c.aspect = W / H; c.updateProjectionMatrix(); });
}
window.addEventListener('resize', onResize);

// ── Lighting ─────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const sun = new THREE.DirectionalLight(0xfff8e8, 1.1);
sun.position.set(60, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.near = 1; sc.far = 400; sc.left = sc.bottom = -100; sc.right = sc.top = 100;
scene.add(sun);

// ── Ground ───────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshLambertMaterial({ color: 0x4a7a3a })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// 格線
const grid = new THREE.GridHelper(300, 60, 0x3a6030, 0x3a6030);
grid.position.y = 0.02;
grid.material.opacity = 0.35;
grid.material.transparent = true;
scene.add(grid);

// ── Home Pad（H 標記）────────────────────────────────────────────
function makeHomePad() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshLambertMaterial({ color: 0xffffff, opacity: 0.55, transparent: true })
  );
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.02;
  g.add(disc);
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 32),
    new THREE.MeshLambertMaterial({ color: 0xf97316, opacity: 0.7, transparent: true })
  );
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.03;
  g.add(inner);
  return g;
}
const homePad = makeHomePad();
scene.add(homePad);

// ── 建築物 ───────────────────────────────────────────────────────
function addBuilding(x, z, w, h, d, col) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: col || 0x8090a0 })
  );
  m.position.set(x, h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3),
    new THREE.MeshLambertMaterial({ color: 0x607080 })
  );
  roof.position.set(x, h + 0.25, z);
  scene.add(roof);
  // 窗戶
  for (let wy = 2; wy < h - 1; wy += 3) {
    for (let wx = -w / 2 + 1; wx < w / 2; wx += 2.5) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.6),
        new THREE.MeshBasicMaterial({ color: 0xfff8c0, opacity: 0.7, transparent: true })
      );
      win.position.set(x + wx, wy, z + d / 2 + 0.01);
      scene.add(win);
    }
  }
}

addBuilding(35,  -18, 9, 14, 8,  0x7a8898);
addBuilding(-28, -32, 7,  9, 7,  0x8a9aa8);
addBuilding(22,   35, 11, 18, 10, 0x6e7d8c);
addBuilding(-40,  18, 8, 11, 8,  0x7b8a99);
addBuilding(50,   10, 6,  7, 6,  0x8c9baa);
addBuilding(-15,  42, 9, 13, 8,  0x78889a);

// ── 樹木 ─────────────────────────────────────────────────────────
function addTree(x, z, h) {
  h = h || (3 + Math.random() * 2);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, h * 0.45, 6),
    new THREE.MeshLambertMaterial({ color: 0x5c3818 })
  );
  trunk.position.set(x, h * 0.225, z);
  trunk.castShadow = true;
  scene.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.8 + Math.random() * 0.6, h * 0.7, 7),
    new THREE.MeshLambertMaterial({ color: 0x2d6a1d - Math.floor(Math.random() * 0x101010) })
  );
  crown.position.set(x, h * 0.6, z);
  crown.castShadow = true;
  scene.add(crown);
}

// 環形樹（飛行場周圍）
for (let i = 0; i < 30; i++) {
  const a = (i / 30) * Math.PI * 2;
  const r = 22 + Math.random() * 6;
  addTree(Math.cos(a) * r + (Math.random() - 0.5) * 4, Math.sin(a) * r + (Math.random() - 0.5) * 4);
}
// 散佈樹
for (let i = 0; i < 15; i++) {
  addTree((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80);
}

// ════════════════════════════════════════════════════════════════
// ALIGN M460 無人機模型
// ════════════════════════════════════════════════════════════════
const drone = new THREE.Group();
scene.add(drone);

// 材質
const matDarkGray = new THREE.MeshLambertMaterial({ color: 0x22252b });
const matMidGray  = new THREE.MeshLambertMaterial({ color: 0x363b44 });
const matBlack    = new THREE.MeshLambertMaterial({ color: 0x0d0e10 });
const matAccent   = new THREE.MeshLambertMaterial({ color: 0x3a4050 });
const matProp     = new THREE.MeshLambertMaterial({ color: 0x1a1c20, transparent: true, opacity: 0.88 });
const matLedG     = new THREE.MeshBasicMaterial({ color: 0x00ff55 });
const matLedR     = new THREE.MeshBasicMaterial({ color: 0xff2200 });

// ── 機身中央 ──
const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.09, 0.19), matDarkGray);
bodyMesh.castShadow = true;
drone.add(bodyMesh);

const topShell = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.16), matMidGray);
topShell.position.set(0, 0.055, 0);
drone.add(topShell);

const batSled = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.13), matAccent);
batSled.position.set(0, 0.07, 0.01);
drone.add(batSled);

const procBump = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.06), matDarkGray);
procBump.position.set(0, -0.052, 0);
drone.add(procBump);

// ── 雲台鏡頭 ──
const gimbalArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.025), matBlack);
gimbalArm.position.set(0, -0.06, -0.09);
drone.add(gimbalArm);

const gimbalBody = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.048, 0.048), matBlack);
gimbalBody.position.set(0, -0.065, -0.105);
drone.add(gimbalBody);

const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.022, 10), matBlack);
lens.rotation.x = Math.PI / 2;
lens.position.set(0, -0.065, -0.127);
drone.add(lens);

const lensGlass = new THREE.Mesh(
  new THREE.CircleGeometry(0.012, 10),
  new THREE.MeshBasicMaterial({ color: 0x223355, transparent: true, opacity: 0.8 })
);
lensGlass.rotation.x = Math.PI / 2;
lensGlass.position.set(0, -0.065, -0.138);
drone.add(lensGlass);

// ── 起落架（2 條滑撬）──
[-0.09, 0.09].forEach(xo => {
  const skid = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.008, 0.20), matBlack);
  skid.position.set(xo, -0.10, 0);
  drone.add(skid);
  [-0.065, 0.065].forEach(zo => {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.055, 4), matBlack);
    strut.position.set(xo, -0.073, zo);
    drone.add(strut);
  });
});

// ── 4 支臂 + 馬達 + 螺旋槳 ──
// 前右=-45°, 前左=-135°, 後右=+45°, 後左=+135°
const ARM_ANGLES_DEG = [-45, -135, 45, 135];
const ARM_IS_FRONT   = [true, true, false, false];
const propGroups = [];

ARM_ANGLES_DEG.forEach((deg, idx) => {
  const ag = new THREE.Group();
  ag.rotation.y = THREE.MathUtils.degToRad(deg);
  drone.add(ag);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.022, 0.030), matMidGray);
  arm.position.x = 0.15;
  arm.castShadow = true;
  ag.add(arm);

  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.030, 0.032), matDarkGray);
  tip.position.x = 0.30;
  ag.add(tip);

  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.046, 12), matBlack);
  motor.position.set(0.30, 0.028, 0);
  ag.add(motor);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.036, 0.010, 12), matMidGray);
  cap.position.set(0.30, 0.055, 0);
  ag.add(cap);

  // 螺旋槳群組
  const pg = new THREE.Group();
  pg.position.set(0.30, 0.064, 0);
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.004, 0.020), matProp);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.004, 0.020), matProp);
  b2.rotation.y = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.010, 8), matBlack);
  pg.add(b1); pg.add(b2); pg.add(hub);
  ag.add(pg);
  propGroups.push(pg);

  // LED 燈珠
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.010, 6, 6),
    ARM_IS_FRONT[idx] ? matLedG : matLedR
  );
  led.position.set(0.30, 0.070, 0);
  ag.add(led);

  // LED 點光源
  const pl = new THREE.PointLight(ARM_IS_FRONT[idx] ? 0x00ff44 : 0xff2200, 0.25, 1.8);
  pl.position.copy(led.position);
  ag.add(pl);
});

// FPV 鏡頭基準點（掛在無人機上）
const fpvPivot = new THREE.Object3D();
fpvPivot.position.set(0, 0, -0.14);
drone.add(fpvPivot);

// 初始化 resize
onResize();

// 通知其他腳本場景已就緒
window.gameSceneReady = true;
