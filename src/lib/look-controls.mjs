// WASD translates; arrow keys change the gaze. Positive yaw turns left in YXZ.
export function lookWithKeys(yaw, pitch, keys, seconds) {
  const horizontal = Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight'));
  const vertical = Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'));
  return {
    yaw: yaw + horizontal * seconds * 1.25,
    pitch: Math.max(-1.3, Math.min(1.3, pitch + vertical * seconds * .95)),
  };
}
