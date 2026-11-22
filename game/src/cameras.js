// The two security cameras: wall-mounted lenses that sweep a fixed arc, see in a red
// cone, and go dark for a while when an EMP hits them.
import { CAMERA } from './config.js';

function makeCamera(name, x, y, baseAngle) {
  return { name, x, y, baseAngle, angle: baseAngle, disabled: 0 };
}

export function createCameras() {
  const cameras = [
    makeCamera('Cam 1', 640, 24, Math.PI / 2), // top wall, sweeping the gallery
    makeCamera('Cam 2', 1256, 420, Math.PI), // right wall, watching the vault approach
  ];

  function reset() {
    for (const camera of cameras) {
      camera.angle = camera.baseAngle;
      camera.disabled = 0;
    }
  }

  /** Advance the sweep; a disabled camera stays dark and does not sweep. */
  function update(dt, time) {
    for (const camera of cameras) {
      if (camera.disabled > 0) {
        camera.disabled = Math.max(0, camera.disabled - dt);
        continue;
      }
      camera.angle =
        camera.baseAngle +
        Math.sin((time / CAMERA.sweepPeriod) * Math.PI * 2) * CAMERA.sweepHalfAngle;
    }
  }

  /** Switch every camera off for `seconds` (an EMP). */
  function disableAll(seconds) {
    for (const camera of cameras) camera.disabled = seconds;
  }

  return { cameras, reset, update, disableAll };
}
