import { battlefieldItems, battlefieldShipBatchLimit, canBatchBattlefieldItem } from './catalog.ts';
import {
  battlefieldHeight,
  battlefieldWidth,
  battlefieldLayerLimit,
  battlefieldObjectLimit,
  type BattlefieldPlacement,
  type BattlefieldScene,
} from '../types/battlefield.ts';
import {
  battlefieldDrawOrder,
  battlefieldLayerSubtree,
  createBattlefieldLayer,
  moveBattlefieldObjects,
  reorderBattlefieldLayer,
} from './layers.ts';
import { movePlacements } from './transforms.ts';

export function battlefieldCopyName(name: string) {
  let prefix = '';
  // Keep the 80-character limit without splitting emoji surrogate pairs.
  for (const character of name.trim()) {
    if (prefix.length + character.length > 73) break;
    prefix += character;
  }
  return prefix + ' (copy)';
}

function checkObjectCapacity(scene: BattlefieldScene, count: number) {
  if (scene.placements.length + count > battlefieldObjectLimit)
    throw new Error(`A Battlefield can contain up to ${battlefieldObjectLimit} objects.`);
}
function checkLayerCapacity(scene: BattlefieldScene, count: number) {
  if (scene.layers.length + count > battlefieldLayerLimit)
    throw new Error(`A Battlefield can contain up to ${battlefieldLayerLimit} layers.`);
}
function offsetCopies(copies: BattlefieldPlacement[]) {
  const offset = (values: number[], maximum: number) => {
    const before = Math.min(...values),
      after = maximum - Math.max(...values);
    if (after >= 24) return 24;
    if (before >= 24) return -24;
    return after >= before ? after : -before;
  };
  const dx = offset(
    copies.map(p => p.x),
    battlefieldWidth,
  );
  const dy = offset(
    copies.map(p => p.y),
    battlefieldHeight,
  );
  return movePlacements(
    copies,
    copies.map(p => p.id),
    dx,
    dy,
  );
}

export function addBattlefieldObjects(
  scene: BattlefieldScene,
  itemId: string,
  options: {
    layerId: string;
    quantity?: number;
    batchParentId?: string | null;
    anchor?: Pick<BattlefieldPlacement, 'x' | 'y'>;
  },
) {
  const item = battlefieldItems[itemId];
  const quantity = options.quantity ?? 1;
  if (item?.kind !== 'object') throw new Error('Choose a valid Battlefield object.');
  const maximum = canBatchBattlefieldItem(item) ? battlefieldShipBatchLimit : 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > maximum)
    throw new Error(`Choose a quantity between 1 and ${maximum}.`);
  checkObjectCapacity(scene, quantity);
  if (!scene.layers.some(layer => layer.id === options.layerId))
    throw new Error('Choose an existing layer.');
  let next = scene;
  let layerId = options.layerId;
  if (quantity > 1) {
    checkLayerCapacity(scene, 1);
    const parentId = options.batchParentId ?? null;
    if (parentId !== null && !scene.layers.some(layer => layer.id === parentId))
      throw new Error('Choose an existing parent layer.');
    layerId = crypto.randomUUID();
    next = createBattlefieldLayer(scene, {
      id: layerId,
      name: item.name + ' squadron',
      visible: true,
      parentId,
      order: 0,
    });
  }
  const index = scene.placements.length;
  const anchor = item.category === 'Add-ons' ? options.anchor : undefined;
  const initialX = anchor ? Math.min(battlefieldWidth, anchor.x + 12) : 300 + ((index * 93) % 950);
  const initialY = anchor ? Math.min(battlefieldHeight, anchor.y + 12) : 130 + ((index * 29) % 150);
  // Leave room around each hull; long batches wrap into rows within the Battlefield.
  const width = item.width ?? 80,
    height = item.height ?? 80,
    gap = 12,
    padding = 20;
  const columns = Math.min(
    quantity,
    Math.floor((battlefieldWidth - padding * 2 + gap) / (width + gap)),
  );
  const rows = Math.ceil(quantity / columns);
  const x =
    quantity === 1
      ? initialX
      : Math.max(
          padding + width / 2,
          Math.min(
            initialX,
            battlefieldWidth - padding - width / 2 - (columns - 1) * (width + gap),
          ),
        );
  const y =
    quantity === 1
      ? initialY
      : Math.max(
          padding + height / 2,
          Math.min(
            initialY,
            battlefieldHeight - padding - height / 2 - (rows - 1) * (height + gap),
          ),
        );
  const copies: BattlefieldPlacement[] = Array.from({ length: quantity }, (_, i) => ({
    id: crypto.randomUUID(),
    itemId,
    x: x + (i % columns) * (width + gap),
    y: y + Math.floor(i / columns) * (height + gap),
    rotation: 0,
    scale: 1,
    colorId: 'color-default',
    ...(item.shape === 'planet' ? { textureId: 'rocky' as const } : {}),
    layerId,
    visible: true,
    order: i,
  }));
  const ids = copies.map(p => p.id);
  next = moveBattlefieldObjects(
    { ...next, placements: [...next.placements, ...copies] },
    ids,
    layerId,
  );
  return { scene: next, ids, layerId };
}

export function duplicateBattlefieldObjects(scene: BattlefieldScene, ids: string[]) {
  const selected = new Set(ids);
  const source = battlefieldDrawOrder(scene).filter(p => selected.has(p.id));
  if (!source.length) throw new Error('Select objects to duplicate.');
  checkObjectCapacity(scene, source.length);
  const copies = offsetCopies(source.map(p => ({ ...p, id: crypto.randomUUID() })));
  let next = { ...scene, placements: [...scene.placements, ...copies] };
  for (const layerId of new Set(copies.map(p => p.layerId)))
    next = moveBattlefieldObjects(
      next,
      copies.filter(p => p.layerId === layerId).map(p => p.id),
      layerId,
    );
  return {
    scene: next,
    ids: copies.map(p => p.id),
    overlapping: copies.every((p, i) => p.x === source[i].x && p.y === source[i].y),
  };
}

export function duplicateBattlefieldLayer(scene: BattlefieldScene, id: string) {
  const root = scene.layers.find(layer => layer.id === id);
  if (!root) throw new Error('Select a layer to duplicate.');
  const subtree = battlefieldLayerSubtree(scene, id);
  const source = scene.placements.filter(p => subtree.has(p.layerId));
  checkObjectCapacity(scene, source.length);
  checkLayerCapacity(scene, subtree.size);
  const layers = new Map([...subtree].map(oldId => [oldId, crypto.randomUUID()]));
  const layerId = layers.get(id)!;
  const copies = offsetCopies(
    source.map(p => ({
      ...p,
      id: crypto.randomUUID(),
      layerId: layers.get(p.layerId)!,
    })),
  );
  const next = reorderBattlefieldLayer(
    {
      ...scene,
      layers: [
        ...scene.layers,
        ...scene.layers
          .filter(layer => subtree.has(layer.id))
          .map(layer => ({
            ...layer,
            id: layers.get(layer.id)!,
            name: layer.id === id ? battlefieldCopyName(layer.name) : layer.name,
            parentId: layer.id === id ? layer.parentId : layers.get(layer.parentId!)!,
          })),
      ],
      placements: [...scene.placements, ...copies],
    },
    layerId,
    id,
    true,
  );
  return {
    scene: next,
    ids: copies.map(p => p.id),
    layerId,
    overlapping:
      source.length > 0 && copies.every((p, i) => p.x === source[i].x && p.y === source[i].y),
  };
}

export function cloneBattlefieldScene(scene: BattlefieldScene): BattlefieldScene {
  const copy = structuredClone(scene);
  const layers = new Map(scene.layers.map(layer => [layer.id, crypto.randomUUID()]));
  return {
    ...copy,
    layers: copy.layers.map(layer => ({
      ...layer,
      id: layers.get(layer.id)!,
      parentId: layer.parentId === null ? null : layers.get(layer.parentId)!,
    })),
    placements: copy.placements.map(p => ({
      ...p,
      id: crypto.randomUUID(),
      layerId: layers.get(p.layerId)!,
    })),
  };
}
