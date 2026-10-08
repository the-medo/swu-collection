import { battlefieldItems, battlefieldItemMaxScale } from './catalog.ts';
import {
  battlefieldDefaultLayerId,
  battlefieldDefaultLight,
  battlefieldHeight,
  battlefieldWidth,
  type BattlefieldScene,
  type LegacyBattlefieldScene,
  type FlatBattlefieldScene,
  type BattlefieldPlacement,
} from '../types/battlefield.ts';

// Stable IDs keep editor/public reads and revision fingerprints identical until
// a converted legacy layout is explicitly saved. Four independently seeded
// hashes give these derived IDs their own deterministic UUID namespace.
function derivedId(value: string) {
  const hex = [2166136261, 2246822507, 3266489909, 668265263]
    .map(seed => {
      let hash = seed;
      for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
      return (hash >>> 0).toString(16).padStart(8, '0');
    })
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function normalizeBattlefieldScene(
  input: BattlefieldScene | FlatBattlefieldScene | LegacyBattlefieldScene,
): BattlefieldScene {
  let scene: BattlefieldScene;
  if ('layers' in input) {
    const counters = new Map<string, number>();
    scene = {
      ...input,
      light: input.light ?? { ...battlefieldDefaultLight },
      layers: input.layers.map((layer, i) => ({
        ...layer,
        parentId: layer.parentId ?? null,
        order: layer.order ?? i,
      })),
      placements: input.placements.map(p => {
        const index = counters.get(p.layerId) ?? 0;
        counters.set(p.layerId, index + 1);
        return { ...p, order: p.order ?? index };
      }),
    };
  } else {
    const groups = [...new Set(input.placements.flatMap(p => (p.groupId ? [p.groupId] : [])))];
    const layers = [
      { id: battlefieldDefaultLayerId, name: 'Scene', visible: true, parentId: null, order: 0 },
      ...groups
        .filter(id => id !== battlefieldDefaultLayerId)
        .map((id, i) => ({
          id,
          name: `Layer ${i + 1}`,
          visible: true,
          parentId: null,
          order: i + 1,
        })),
    ];
    const used = new Set(input.placements.map(p => p.id));
    const placements: BattlefieldPlacement[] = [];
    for (const legacy of input.placements) {
      const { addonIds, groupId, ...geometry } = legacy;
      const parent = {
        ...geometry,
        layerId: groupId ?? battlefieldDefaultLayerId,
        visible: true,
        order: 0,
      };
      placements.push(parent);
      const host = battlefieldItems[parent.itemId];
      for (const addonId of [...new Set(addonIds)]) {
        const item = battlefieldItems[addonId];
        if (!host || item?.category !== 'Add-ons') continue;
        const [x, y, angle, denominator] =
          addonId === 'addon-city'
            ? [-16, 11, -20, 180]
            : addonId === 'addon-ion'
              ? [18, -18, -25, 168]
              : [-8, -20, 0, 57.6];
        const dx = ((x * (host.width ?? 120)) / 120) * parent.scale;
        const dy = ((y * (host.height ?? 120)) / 120) * parent.scale;
        const radians = (parent.rotation * Math.PI) / 180;
        let suffix = 0;
        let id = derivedId(`${parent.id}:${addonId}:${suffix}`);
        while (used.has(id)) id = derivedId(`${parent.id}:${addonId}:${++suffix}`);
        used.add(id);
        placements.push({
          id,
          itemId: addonId,
          x: Math.max(
            0,
            Math.min(battlefieldWidth, parent.x + dx * Math.cos(radians) - dy * Math.sin(radians)),
          ),
          y: Math.max(
            0,
            Math.min(battlefieldHeight, parent.y + dx * Math.sin(radians) + dy * Math.cos(radians)),
          ),
          rotation: (((parent.rotation + angle) % 360) + 360) % 360,
          scale: Math.max(0.2, Math.min(3, ((host.width ?? 120) * parent.scale) / denominator)),
          colorId: 'color-default',
          layerId: parent.layerId,
          visible: true,
          order: 0,
        });
      }
    }
    const counters = new Map<string, number>();
    scene = {
      ...input,
      light: input.light ?? { ...battlefieldDefaultLight },
      layers,
      placements: placements.map(p => {
        const order = counters.get(p.layerId) ?? 0;
        counters.set(p.layerId, order + 1);
        return { ...p, order };
      }),
    };
  }
  return {
    ...scene,
    placements: scene.placements.map(p => {
      const item = battlefieldItems[p.itemId];
      return item?.kind === 'object' && p.scale > battlefieldItemMaxScale(item)
        ? { ...p, scale: battlefieldItemMaxScale(item) }
        : p;
    }),
  };
}
