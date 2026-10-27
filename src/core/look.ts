// Looking around without a headset: drag, or move the phone. The visitor only turns, never moves.
import { Euler, MathUtils, Quaternion, Vector3, type PerspectiveCamera } from 'three';

const PITCH_LIMIT = 40;
const DEG_PER_PX = 0.22;

type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export type Look = {
  readonly drag: (dx: number, dy: number) => void;
  /** iOS asks for permission, which needs a user gesture: call from a tap. */
  readonly useDeviceOrientation: () => Promise<void>;
  readonly update: () => void;
};

export const createLook = (camera: PerspectiveCamera, initialPitch: number): Look => {
  let yaw = 0;
  let pitch = initialPitch;
  let device: { alpha: number; beta: number; gamma: number } | null = null;
  // Dragging while the phone steers adds to the phone's heading instead of fighting it.
  let deviceYawOffset = 0;

  const deviceQuat = new Quaternion();
  const euler = new Euler();
  const screenFix = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  const zAxis = new Vector3(0, 0, 1);
  const yAxis = new Vector3(0, 1, 0);
  const turn = new Quaternion();
  const screenTurn = new Quaternion();

  return {
    drag: (dx, dy) => {
      if (device) {
        deviceYawOffset -= dx * DEG_PER_PX;
        return;
      }
      yaw -= dx * DEG_PER_PX;
      pitch = MathUtils.clamp(pitch + dy * DEG_PER_PX, -PITCH_LIMIT, PITCH_LIMIT);
    },
    useDeviceOrientation: async () => {
      if (!('DeviceOrientationEvent' in window)) return;
      const ctor = DeviceOrientationEvent as OrientationEventWithPermission;
      try {
        if (typeof ctor.requestPermission === 'function' && (await ctor.requestPermission()) !== 'granted') return;
      } catch {
        return;
      }
      window.addEventListener('deviceorientation', (e) => {
        if (e.alpha === null || e.beta === null || e.gamma === null) return;
        // The first reading defines "straight ahead", so the view does not jump.
        if (!device) deviceYawOffset = -e.alpha;
        device = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
      });
    },
    update: () => {
      if (device) {
        const orient = MathUtils.degToRad(screen.orientation?.angle ?? 0);
        euler.set(
          MathUtils.degToRad(device.beta),
          MathUtils.degToRad(device.alpha),
          -MathUtils.degToRad(device.gamma),
          'YXZ',
        );
        deviceQuat.setFromEuler(euler).multiply(screenFix).multiply(screenTurn.setFromAxisAngle(zAxis, -orient));
        turn.setFromAxisAngle(yAxis, MathUtils.degToRad(deviceYawOffset));
        camera.quaternion.copy(turn).multiply(deviceQuat);
        return;
      }
      camera.rotation.set(MathUtils.degToRad(pitch), MathUtils.degToRad(yaw), 0, 'YXZ');
    },
  };
};
