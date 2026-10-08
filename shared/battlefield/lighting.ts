import {
  battlefieldHeight,
  battlefieldWidth,
  type BattlefieldLight,
  type BattlefieldPlacement,
} from '../types/battlefield.ts';

export type BattlefieldLightDirection = { x: number; y: number };
// Runtime positions may lie outside a scene; saved editor handles remain bounded.
export type BattlefieldLightPosition = Pick<BattlefieldLight, 'x' | 'y'>;
export type BattlefieldLightFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: 0 | 180;
};

// Map a shared source through the centered "meet" area of an SVG viewport.
// A 180-degree frame represents a board facing the other player.
export function battlefieldLightInFrame(
  light: BattlefieldLightPosition,
  frame: BattlefieldLightFrame,
): BattlefieldLightPosition {
  if (
    ![light.x, light.y, frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) ||
    frame.width <= 0 ||
    frame.height <= 0 ||
    (frame.rotation !== undefined && frame.rotation !== 0 && frame.rotation !== 180)
  )
    throw new RangeError('The light and frame must be finite, with positive frame dimensions.');
  const scale = Math.min(frame.width / battlefieldWidth, frame.height / battlefieldHeight);
  const facing = frame.rotation === 180 ? -1 : 1;
  return {
    x: battlefieldWidth / 2 + (facing * (light.x - frame.x - frame.width / 2)) / scale,
    y: battlefieldHeight / 2 + (facing * (light.y - frame.y - frame.height / 2)) / scale,
  };
}

export const battlefieldLightMotionPeriod = 90_000;

// Start at the saved pose and follow a slow, seamless ellipse. This is render
// state only: it may travel outside the scene without changing the saved layout.
export function animatedBattlefieldLight(
  anchor: BattlefieldLightPosition,
  elapsedMs: number,
): BattlefieldLightPosition {
  const phase =
    ((Math.max(0, elapsedMs) % battlefieldLightMotionPeriod) / battlefieldLightMotionPeriod) *
    Math.PI *
    2;
  return {
    x: anchor.x + Math.sin(phase) * battlefieldWidth * 0.4,
    y: anchor.y + (1 - Math.cos(phase)) * battlefieldHeight * 0.75,
  };
}

// Express the world-space light direction in the object's unrotated coordinates.
export function battlefieldLightDirection(
  placement: Pick<BattlefieldPlacement, 'x' | 'y' | 'rotation'>,
  light: BattlefieldLightPosition,
): BattlefieldLightDirection {
  const dx = light.x - placement.x;
  const dy = light.y - placement.y;
  const distance = Math.hypot(dx, dy);
  const x = distance > 0.0001 ? dx / distance : -Math.SQRT1_2;
  const y = distance > 0.0001 ? dy / distance : -Math.SQRT1_2;
  const angle = (placement.rotation * Math.PI) / 180;
  return {
    x: x * Math.cos(angle) + y * Math.sin(angle),
    y: -x * Math.sin(angle) + y * Math.cos(angle),
  };
}

export function moveBattlefieldLight(light: BattlefieldLight, dx: number, dy: number) {
  return {
    ...light,
    x: Math.max(0, Math.min(battlefieldWidth, light.x + dx)),
    y: Math.max(0, Math.min(battlefieldHeight, light.y + dy)),
  };
}
