const MINIMAP_LAYER = 1;

function seededRandom(seed = 460) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function setLayerRecursive(object, layer) {
  object.traverse(child => child.layers.set(layer));
}

export function createGameScene({ THREE, canvas }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ec8f0);
  scene.fog = new THREE.FogExp2(0xaed8f0, 0.005);
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const sun = new THREE.DirectionalLight(0xfff8e8, 1.1);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { near: 1, far: 400, left: -100, right: 100, top: 100, bottom: -100 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ color: 0x4a7a3a }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(300, 60, 0x3a6030, 0x3a6030);
  grid.position.y = 0.02;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);

  const homePad = new THREE.Group();
  for (const [radius, color, opacity, y] of [[1.5, 0xffffff, 0.55, 0.02], [1, 0xf97316, 0.7, 0.03]]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshLambertMaterial({ color, opacity, transparent: true }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = y;
    homePad.add(disc);
  }
  scene.add(homePad);

  function addBuilding(x, z, width, height, depth, color) {
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshLambertMaterial({ color }));
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.5, depth + 0.3), new THREE.MeshLambertMaterial({ color: 0x607080 }));
    roof.position.set(x, height + 0.25, z);
    scene.add(roof);
  }
  [
    [35, -18, 9, 14, 8, 0x7a8898], [-28, -32, 7, 9, 7, 0x8a9aa8],
    [22, 35, 11, 18, 10, 0x6e7d8c], [-40, 18, 8, 11, 8, 0x7b8a99],
    [50, 10, 6, 7, 6, 0x8c9baa], [-15, 42, 9, 13, 8, 0x78889a],
  ].forEach(args => addBuilding(...args));

  const random = seededRandom();
  function addTree(x, z, height = 3 + random() * 2) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, height * 0.45, 6), new THREE.MeshLambertMaterial({ color: 0x5c3818 }));
    trunk.position.set(x, height * 0.225, z);
    trunk.castShadow = true;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.8 + random() * 0.6, height * 0.7, 7), new THREE.MeshLambertMaterial({ color: 0x245f1b }));
    crown.position.set(x, height * 0.6, z);
    crown.castShadow = true;
    scene.add(crown);
  }
  function courseClear(x, z) {
    return x > -9 && x < 29 && z > -40 && z < 18;
  }
  for (let i = 0; i < 40; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 32 + random() * 25;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!courseClear(x, z)) addTree(x, z);
  }

  const drone = new THREE.Group();
  scene.add(drone);
  const matDark = new THREE.MeshLambertMaterial({ color: 0x22252b });
  const matMid = new THREE.MeshLambertMaterial({ color: 0x363b44 });
  const matBlack = new THREE.MeshLambertMaterial({ color: 0x0d0e10 });
  const matProp = new THREE.MeshLambertMaterial({ color: 0x1a1c20, transparent: true, opacity: 0.88 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.09, 0.19), matDark);
  body.castShadow = true;
  drone.add(body);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.16), matMid);
  shell.position.y = 0.055;
  drone.add(shell);
  const gimbal = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.048, 0.048), matBlack);
  gimbal.position.set(0, -0.065, -0.105);
  drone.add(gimbal);
  [-0.09, 0.09].forEach(x => {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.008, 0.2), matBlack);
    skid.position.set(x, -0.1, 0);
    drone.add(skid);
  });
  const propGroups = [];
  [-45, -135, 45, 135].forEach((degrees, index) => {
    const armGroup = new THREE.Group();
    armGroup.rotation.y = THREE.MathUtils.degToRad(degrees);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.022, 0.03), matMid);
    arm.position.x = 0.15;
    armGroup.add(arm);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.046, 12), matBlack);
    motor.position.set(0.3, 0.028, 0);
    armGroup.add(motor);
    const props = new THREE.Group();
    props.position.set(0.3, 0.064, 0);
    const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.004, 0.02), matProp);
    const bladeB = bladeA.clone();
    bladeB.rotation.y = Math.PI / 2;
    props.add(bladeA, bladeB);
    armGroup.add(props);
    propGroups.push(props);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshBasicMaterial({ color: index < 2 ? 0x00ff55 : 0xff2200 }));
    led.position.set(0.3, 0.07, 0);
    armGroup.add(led);
    drone.add(armGroup);
  });
  const fpvPivot = new THREE.Object3D();
  fpvPivot.position.set(0, 0, -0.14);
  drone.add(fpvPivot);

  const minimapGroup = new THREE.Group();
  setLayerRecursive(minimapGroup, MINIMAP_LAYER);
  scene.add(minimapGroup);
  const boundaryPoints = [[-8, 8], [28, 8], [28, -38], [-8, -38], [-8, 8]].map(([x, z]) => new THREE.Vector3(x, 0.15, z));
  const boundary = new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundaryPoints), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  boundary.layers.set(MINIMAP_LAYER);
  minimapGroup.add(boundary);
  const arrowGeometry = new THREE.BufferGeometry();
  arrowGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -1.5, -0.9, 0, 1.1, 0, 0, 0.55, 0.9, 0, 1.1], 3));
  arrowGeometry.setIndex([0, 1, 2, 0, 2, 3]);
  arrowGeometry.computeVertexNormals();
  const droneArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, depthTest: false }));
  droneArrow.layers.set(MINIMAP_LAYER);
  droneArrow.renderOrder = 100;
  minimapGroup.add(droneArrow);

  let missionMarkers = [];
  function createLabel(text, color = '#ffffff') {
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128;
    labelCanvas.height = 128;
    const context = labelCanvas.getContext('2d');
    context.fillStyle = 'rgba(0,0,0,0.72)';
    context.beginPath();
    context.arc(64, 64, 42, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 7;
    context.stroke();
    context.fillStyle = '#ffffff';
    context.font = 'bold 58px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 64, 68);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(labelCanvas), depthTest: false }));
    sprite.scale.set(4, 4, 1);
    sprite.layers.set(MINIMAP_LAYER);
    return sprite;
  }
  const homeLabel = createLabel('H', '#fb923c');
  homeLabel.position.set(0, 12, 0);
  minimapGroup.add(homeLabel);

  function clearMissionMarkers() {
    missionMarkers.forEach(marker => scene.remove(marker));
    missionMarkers = [];
  }

  function setMissionMarkers(markers) {
    clearMissionMarkers();
    markers.forEach(({ x, z, label, color }) => {
      const group = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 8), new THREE.MeshLambertMaterial({ color: 0xaaaaaa }));
      pole.position.y = 3;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshLambertMaterial({ color }));
      ball.position.y = 6.5;
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2, 24), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      const sprite = createLabel(label, `#${color.toString(16).padStart(6, '0')}`);
      sprite.position.y = 12;
      group.add(pole, ball, ring, sprite);
      group.position.set(x, 0, z);
      scene.add(group);
      missionMarkers.push(group);
    });
  }

  let propAngle = 0;
  function syncFlightState(state, dt) {
    if (state.armed) propAngle += dt * 28;
    propGroups.forEach((props, index) => {
      props.rotation.y = propAngle * (index % 2 === 0 ? 1 : -1);
      props.children.forEach(child => { if (child.material === matProp) child.material.opacity = state.armed ? 0.45 : 0.88; });
    });
    drone.position.copy(state.pos);
    drone.rotation.set(state.vPitch, state.yaw, state.vRoll);
    droneArrow.position.set(state.pos.x, Math.max(state.pos.y + 3, 14), state.pos.z);
    droneArrow.rotation.y = state.yaw;
  }

  return {
    renderer, scene, drone, fpvPivot, minimapLayer: MINIMAP_LAYER,
    syncFlightState, setMissionMarkers, clearMissionMarkers,
  };
}
