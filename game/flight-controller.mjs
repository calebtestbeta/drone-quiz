import { FLIGHT_PARAMS } from './state.mjs';

export function createFlightController({ THREE, state, onLanded = () => {} }) {
  let batteryTimer = 0;

  function setFlightMode(mode) {
    state.flightMode = mode;
  }

  function toggleArm() {
    if (state.rth || state.autoLand) return false;
    state.armed = !state.armed;
    if (!state.armed) {
      state.vel.set(0, 0, 0);
      state.vPitch = 0;
      state.vRoll = 0;
      setFlightMode('P-GPS');
    }
    return true;
  }

  function triggerRth() {
    if (!state.armed || state.rth) return false;
    state.rth = true;
    setFlightMode('RTH');
    return true;
  }

  function lerpAngle(a, b, t) {
    let delta = b - a;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return a + delta * t;
  }

  function land() {
    state.pos.y = 0.12;
    state.vel.set(0, 0, 0);
    state.rth = false;
    state.autoLand = false;
    state.armed = false;
    state.vPitch = 0;
    state.vRoll = 0;
    setFlightMode('P-GPS');
    onLanded(state);
  }

  function updateRth(dt) {
    const rthAlt = Math.max(state.homePos.y + 12, state.pos.y);
    const toHome = new THREE.Vector3(state.homePos.x - state.pos.x, 0, state.homePos.z - state.pos.z);
    const distance = toHome.length();
    if (state.pos.y < rthAlt - 0.5) {
      state.vel.y = THREE.MathUtils.lerp(state.vel.y, 3.5, dt * 2.5);
      state.vel.x *= Math.exp(-4 * dt);
      state.vel.z *= Math.exp(-4 * dt);
    } else {
      if (distance > 0.3) {
        const speed = Math.min(distance * 1.8, 5);
        const direction = toHome.clone().normalize();
        state.vel.x = THREE.MathUtils.lerp(state.vel.x, direction.x * speed, dt * 2.5);
        state.vel.z = THREE.MathUtils.lerp(state.vel.z, direction.z * speed, dt * 2.5);
        state.yaw = lerpAngle(state.yaw, Math.atan2(-toHome.x, -toHome.z), dt * 1.5);
      } else {
        state.vel.x = THREE.MathUtils.lerp(state.vel.x, 0, dt * 5);
        state.vel.z = THREE.MathUtils.lerp(state.vel.z, 0, dt * 5);
      }
      state.vel.y = THREE.MathUtils.lerp(state.vel.y, distance < 2 ? -1.8 : 0, dt * 3);
    }
    state.pos.addScaledVector(state.vel, dt);
    state.vPitch = THREE.MathUtils.lerp(state.vPitch, 0, dt * 5);
    state.vRoll = THREE.MathUtils.lerp(state.vRoll, 0, dt * 5);
    if (state.pos.y <= 0.12) land();
  }

  function updateAutoLand(dt) {
    state.vel.x = THREE.MathUtils.lerp(state.vel.x, 0, dt * 4);
    state.vel.z = THREE.MathUtils.lerp(state.vel.z, 0, dt * 4);
    state.vel.y = -1;
    state.pos.addScaledVector(state.vel, dt);
    if (state.pos.y <= 0.12) land();
  }

  function updatePhysics(dt, input) {
    if (!state.armed) return;
    dt = Math.min(dt, 0.033);
    if (state.rth) return updateRth(dt);
    if (state.autoLand) return updateAutoLand(dt);

    const verticalAccel = input.ly > 0 ? input.ly * FLIGHT_PARAMS.liftAccel : input.ly * FLIGHT_PARAMS.descentAccel;
    state.vel.y += verticalAccel * dt;
    state.vel.y *= Math.exp(-FLIGHT_PARAMS.vDrag * dt);
    state.vel.y = THREE.MathUtils.clamp(state.vel.y, -FLIGHT_PARAMS.maxVV, FLIGHT_PARAMS.maxVV);
    state.yaw -= input.lx * FLIGHT_PARAMS.yawRate * dt;

    const sinY = Math.sin(state.yaw);
    const cosY = Math.cos(state.yaw);
    const horizontalInputMagnitude = Math.hypot(input.rx, input.ry);
    const horizontalInputScale = horizontalInputMagnitude > 1 ? 1 / horizontalInputMagnitude : 1;
    const horizontalInputX = input.rx * horizontalInputScale;
    const horizontalInputY = input.ry * horizontalInputScale;
    const targetVelocityX = (horizontalInputY * -sinY + horizontalInputX * cosY) * FLIGHT_PARAMS.maxHorizontalSpeed;
    const targetVelocityZ = (horizontalInputY * -cosY + horizontalInputX * -sinY) * FLIGHT_PARAMS.maxHorizontalSpeed;
    const hasHorizontalInput = horizontalInputMagnitude > 0;
    const response = hasHorizontalInput ? FLIGHT_PARAMS.horizontalResponse : FLIGHT_PARAMS.horizontalBrakeResponse;
    const horizontalBlend = 1 - Math.exp(-response * dt);
    state.vel.x = THREE.MathUtils.lerp(state.vel.x, targetVelocityX, horizontalBlend);
    state.vel.z = THREE.MathUtils.lerp(state.vel.z, targetVelocityZ, horizontalBlend);
    state.pos.addScaledVector(state.vel, dt);
    if (state.pos.y < 0.12) {
      state.pos.y = 0.12;
      if (state.vel.y < 0) state.vel.y = 0;
    }
    state.vPitch = THREE.MathUtils.lerp(state.vPitch, -horizontalInputY * FLIGHT_PARAMS.maxTilt, dt * 9);
    state.vRoll = THREE.MathUtils.lerp(state.vRoll, -horizontalInputX * FLIGHT_PARAMS.maxTilt, dt * 9);
  }

  function updateBattery(dt) {
    if (!state.armed) return;
    batteryTimer += dt;
    if (batteryTimer < 0.25) return;
    const elapsed = batteryTimer;
    batteryTimer = 0;
    const horizontalSpeed = Math.hypot(state.vel.x, state.vel.z);
    state.battery = Math.max(0, state.battery - (0.03 + Math.abs(state.vel.y) * 0.012 + horizontalSpeed * 0.006) * elapsed);
    if (state.battery <= 0 && !state.autoLand && !state.rth) {
      state.autoLand = true;
      setFlightMode('RTH');
    } else if (state.battery <= 15 && !state.rth && !state.autoLand) {
      triggerRth();
    }
  }

  function update(dt, input) {
    updatePhysics(dt, input);
    updateBattery(dt);
  }

  function reset() {
    batteryTimer = 0;
  }

  return { update, toggleArm, triggerRth, reset, land };
}
