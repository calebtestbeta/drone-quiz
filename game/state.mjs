export const FLIGHT_PARAMS = Object.freeze({
  liftAccel: 9,
  descentAccel: 5,
  maxHorizontalSpeed: 5,
  horizontalResponse: 3,
  horizontalBrakeResponse: 5,
  rightStickDeadzone: 0.08,
  maxVV: 5,
  yawRate: 2,
  vDrag: 3,
  maxTilt: 0.3,
});

export function createFlightState(THREE) {
  return {
    pos: new THREE.Vector3(0, 0.12, 0),
    vel: new THREE.Vector3(),
    yaw: 0,
    vPitch: 0,
    vRoll: 0,
    battery: 100,
    armed: false,
    rth: false,
    autoLand: false,
    homePos: new THREE.Vector3(0, 0, 0),
    flightMode: 'P-GPS',
  };
}

export function resetFlightState(state) {
  state.pos.set(0, 0.12, 0);
  state.vel.set(0, 0, 0);
  state.yaw = 0;
  state.vPitch = 0;
  state.vRoll = 0;
  state.battery = 100;
  state.armed = false;
  state.rth = false;
  state.autoLand = false;
  state.homePos.set(0, 0, 0);
  state.flightMode = 'P-GPS';
  return state;
}

export function createAppState(THREE) {
  return {
    flight: createFlightState(THREE),
    mode: 'idle',
    view: 'third',
    paused: true,
    pipEnabled: false,
  };
}
