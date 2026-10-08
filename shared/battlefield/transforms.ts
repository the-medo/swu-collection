import type { BattlefieldPlacement } from '../types/battlefield.ts';
import { battlefieldHeight, battlefieldWidth } from '../types/battlefield.ts';

export function movePlacements(
  placements: BattlefieldPlacement[],
  ids: string[],
  dx: number,
  dy: number,
) {
  const selected = placements.filter(p => ids.includes(p.id));
  if (!selected.length) return placements;
  dx = Math.max(
    -Math.min(...selected.map(p => p.x)),
    Math.min(dx, battlefieldWidth - Math.max(...selected.map(p => p.x))),
  );
  dy = Math.max(
    -Math.min(...selected.map(p => p.y)),
    Math.min(dy, battlefieldHeight - Math.max(...selected.map(p => p.y))),
  );
  return placements.map(p => (ids.includes(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p));
}

export function rotatePlacements(
  placements: BattlefieldPlacement[],
  ids: string[],
  degrees: number,
) {
  const selected = placements.filter(p => ids.includes(p.id));
  if (!selected.length) return placements;
  const cx = selected.reduce((sum, p) => sum + p.x, 0) / selected.length;
  const cy = selected.reduce((sum, p) => sum + p.y, 0) / selected.length;
  const radians = (degrees * Math.PI) / 180;
  const rotated = selected.map(p => ({
    ...p,
    x: cx + (p.x - cx) * Math.cos(radians) - (p.y - cy) * Math.sin(radians),
    y: cy + (p.x - cx) * Math.sin(radians) + (p.y - cy) * Math.cos(radians),
    rotation: (((p.rotation + degrees) % 360) + 360) % 360,
  }));
  // Shift the whole formation back into the canvas, preserving spacing.
  const minX = Math.min(...rotated.map(p => p.x)),
    maxX = Math.max(...rotated.map(p => p.x));
  const minY = Math.min(...rotated.map(p => p.y)),
    maxY = Math.max(...rotated.map(p => p.y));
  if (maxX - minX > battlefieldWidth || maxY - minY > battlefieldHeight) return placements;
  const dx = minX < 0 ? -minX : maxX > battlefieldWidth ? battlefieldWidth - maxX : 0;
  const dy = minY < 0 ? -minY : maxY > battlefieldHeight ? battlefieldHeight - maxY : 0;
  return placements.map(p => {
    const value = rotated.find(r => r.id === p.id);
    return value ? { ...value, x: value.x + dx, y: value.y + dy } : p;
  });
}
