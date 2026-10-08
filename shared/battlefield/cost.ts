import {
  battlefieldItems,
  battlefieldItemMaxScale,
  battlefieldDeathStarMaximumCost,
  hasBattlefieldAreaPricing,
} from './catalog.ts';
import { battlefieldPlanetTextureIds } from './planets.ts';
import {
  defaultBattlefieldScene,
  type BattlefieldPlacement,
  type BattlefieldScene,
} from '../types/battlefield.ts';
import { battlefieldLayerIssue } from './layers.ts';
import { normalizeBattlefieldScene } from './normalize.ts';

export class BattlefieldSceneError extends Error {}

export function battlefieldObjectCost(placement: BattlefieldPlacement): number {
  const item = battlefieldItems[placement.itemId];
  if (item?.kind !== 'object')
    throw new BattlefieldSceneError('Choose a valid Battlefield object.');
  const maxScale = battlefieldItemMaxScale(item);
  if (!Number.isFinite(placement.scale) || placement.scale < 0.2 || placement.scale > maxScale) {
    if (Number.isFinite(placement.scale) && placement.scale > 1 && item.category === 'Ships')
      throw new BattlefieldSceneError(
        'Ships can only be reduced to 20–100% of their original size.',
      );
    throw new BattlefieldSceneError(`Choose an object size between 20% and ${maxScale * 100}%.`);
  }
  if (
    placement.textureId !== undefined &&
    (item.shape !== 'planet' || !battlefieldPlanetTextureIds.includes(placement.textureId))
  )
    throw new BattlefieldSceneError('Choose a valid planet surface.');
  const factor = hasBattlefieldAreaPricing(item) ? Math.max(1, placement.scale ** 2) : 1;
  // The Death Star spreads its extra cost across the area added from 100% to 300%.
  const cost =
    item.shape === 'death-star'
      ? item.cost +
        ((factor - 1) / (maxScale ** 2 - 1)) * (battlefieldDeathStarMaximumCost - item.cost)
      : item.cost * factor;
  // Round up to whole credits without charging an extra credit for binary
  // floating-point noise (e.g. 300 × 1.1² should be exactly 363).
  return Math.ceil(Number(cost.toFixed(8)));
}

// Each object, including add-ons, counts separately. Used colors count once.
// Credits are a capacity for each independent layout, never a payment.
export function battlefieldCost(scene: BattlefieldScene): number {
  const background = battlefieldItems[scene.backgroundId];
  if (background?.kind !== 'background')
    throw new BattlefieldSceneError('Choose a valid background.');
  const layerIssue = battlefieldLayerIssue(scene);
  if (layerIssue) throw new BattlefieldSceneError(layerIssue);
  const layers = new Set(scene.layers.map(layer => layer.id));
  let cost = background.cost;
  const customizations = new Set<string>();
  const ids = new Set<string>();
  for (const placement of scene.placements) {
    if (ids.has(placement.id))
      throw new BattlefieldSceneError('Each object must have a unique placement ID.');
    ids.add(placement.id);
    if (!layers.has(placement.layerId))
      throw new BattlefieldSceneError('Every object must belong to an existing layer.');
    const item = battlefieldItems[placement.itemId];
    if (item?.kind !== 'object')
      throw new BattlefieldSceneError('Choose a valid Battlefield object.');
    cost += battlefieldObjectCost(placement);
    if (battlefieldItems[placement.colorId]?.kind !== 'color')
      throw new BattlefieldSceneError('Choose a valid object color.');
    customizations.add(placement.colorId);
  }
  for (const id of customizations) cost += battlefieldItems[id]!.cost;
  return cost;
}

// Keep valid geometry and grouping when an old layout contains catalog items
// that are no longer available. Repair changes only the local draft until Save.
export function repairBattlefieldScene(scene: BattlefieldScene): BattlefieldScene {
  const layerIds = new Set<string>();
  const layers = scene.layers
    .filter(layer => {
      if (layerIds.has(layer.id)) return false;
      layerIds.add(layer.id);
      return true;
    })
    .map(layer => ({
      ...layer,
      parentId:
        layer.parentId !== null && !scene.layers.some(parent => parent.id === layer.parentId)
          ? null
          : layer.parentId,
    }));
  if (!layers.length) layers.push(defaultBattlefieldScene().layers[0]);
  const byId = new Map(layers.map(layer => [layer.id, layer]));
  for (const layer of layers) {
    const path = new Set<string>();
    let current: typeof layer | undefined = layer;
    while (current) {
      path.add(current.id);
      if (current.parentId === null) break;
      if (path.has(current.parentId)) {
        current.parentId = null;
        break;
      }
      current = byId.get(current.parentId);
    }
  }
  const ids = new Set<string>();
  const placements = scene.placements
    .filter(p => {
      if (battlefieldItems[p.itemId]?.kind !== 'object' || ids.has(p.id)) return false;
      ids.add(p.id);
      return true;
    })
    .map(p => ({
      ...p,
      colorId: battlefieldItems[p.colorId]?.kind === 'color' ? p.colorId : 'color-default',
      textureId:
        battlefieldItems[p.itemId]?.shape === 'planet' &&
        p.textureId !== undefined &&
        battlefieldPlanetTextureIds.includes(p.textureId)
          ? p.textureId
          : undefined,
      layerId: byId.has(p.layerId) ? p.layerId : layers[0].id,
    }));
  return normalizeBattlefieldScene({
    ...scene,
    layers,
    placements,
    backgroundId:
      battlefieldItems[scene.backgroundId]?.kind === 'background'
        ? scene.backgroundId
        : 'background-default',
  });
}
