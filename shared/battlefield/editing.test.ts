import { expect, test } from 'bun:test';
import { battlefieldCatalog, battlefieldItems, canBatchBattlefieldItem } from './catalog.ts';
import { battlefieldCost } from './cost.ts';
import {
  addBattlefieldObjects,
  battlefieldCopyName,
  cloneBattlefieldScene,
  duplicateBattlefieldLayer,
  duplicateBattlefieldObjects,
} from './editing.ts';
import { battlefieldChildren, battlefieldLayerSubtree } from './layers.ts';
import { battlefieldSceneSchema, defaultBattlefieldScene } from '../types/battlefield.ts';

function nestedScene() {
  const base = defaultBattlefieldScene();
  const child = crypto.randomUUID(),
    grandchild = crypto.randomUUID();
  const scene = {
    ...base,
    light: { x: 1470, y: 25 },
    layers: [
      base.layers[0],
      { id: child, name: 'Escort', parentId: base.layers[0].id, visible: true, order: 1 },
      { id: grandchild, name: 'Hidden', parentId: child, visible: false, order: 2 },
    ],
    placements: [
      {
        id: crypto.randomUUID(),
        itemId: 'planet',
        x: 1300,
        y: 260,
        rotation: 35,
        scale: 1.5,
        textureId: 'ocean' as const,
        colorId: 'color-gold',
        layerId: base.layers[0].id,
        visible: true,
        order: 0,
      },
      {
        id: crypto.randomUUID(),
        itemId: 'ship-x-wing',
        x: 1100,
        y: 200,
        rotation: 15,
        scale: 0.5,
        colorId: 'color-default',
        layerId: child,
        visible: true,
        order: 0,
      },
      {
        id: crypto.randomUUID(),
        itemId: 'ship-tie',
        x: 1050,
        y: 220,
        rotation: 330,
        scale: 1,
        colorId: 'color-gold',
        layerId: grandchild,
        visible: false,
        order: 0,
      },
    ],
  };
  return battlefieldSceneSchema.parse(scene);
}

test('small-ship batches have distinct hulls, a shared squadron layer and full per-copy costs', () => {
  for (const item of battlefieldCatalog.filter(canBatchBattlefieldItem)) {
    const base = defaultBattlefieldScene();
    const result = addBattlefieldObjects(base, item.id, {
      quantity: 50,
      layerId: base.layers[0].id,
    });
    expect(base.placements).toHaveLength(0);
    expect(base.layers).toHaveLength(1);
    expect(battlefieldSceneSchema.safeParse(result.scene).success).toBe(true);
    expect(result.scene.layers).toHaveLength(2);
    expect(result.scene.layers[1].name).toBe(item.name + ' squadron');
    expect(new Set(result.ids).size).toBe(50);
    const copies = result.scene.placements;
    expect(copies).toHaveLength(50);
    expect(copies.every(p => p.layerId === result.layerId && p.scale === 1)).toBe(true);
    expect(battlefieldCost(result.scene)).toBe(50 * item.cost);
    for (const p of copies) {
      expect(p.x - item.width! / 2).toBeGreaterThanOrEqual(0);
      expect(p.x + item.width! / 2).toBeLessThanOrEqual(1600);
      expect(p.y - item.height! / 2).toBeGreaterThanOrEqual(0);
      expect(p.y + item.height! / 2).toBeLessThanOrEqual(400);
    }
    for (let i = 0; i < copies.length; i++)
      for (const b of copies.slice(i + 1)) {
        const a = copies[i];
        expect(Math.abs(a.x - b.x) >= item.width! || Math.abs(a.y - b.y) >= item.height!).toBe(
          true,
        );
      }
  }
  expect(canBatchBattlefieldItem(battlefieldItems['ship-executor']!)).toBe(false);
});

test('batches can nest in a chosen folder; one object keeps the active layer and add-ons anchor nearby', () => {
  const base = nestedScene();
  const parent = base.layers[1].id;
  const batch = addBattlefieldObjects(base, 'ship-tie', {
    quantity: 5,
    layerId: parent,
    batchParentId: parent,
  });
  expect(batch.scene.layers.find(layer => layer.id === batch.layerId)?.parentId).toBe(parent);
  const copies = batch.scene.placements.filter(p => batch.ids.includes(p.id));
  expect(new Set(copies.map(p => p.y)).size).toBe(1);
  expect(new Set(copies.map(p => p.x)).size).toBe(5);
  const single = addBattlefieldObjects(base, 'ship-x-wing', { layerId: parent });
  expect(single.scene.layers).toHaveLength(base.layers.length);
  expect(single.scene.placements.at(-1)?.layerId).toBe(parent);
  const addon = addBattlefieldObjects(base, 'addon-city', {
    layerId: parent,
    anchor: { x: 400, y: 100 },
  });
  expect(addon.scene.placements.at(-1)).toMatchObject({ x: 412, y: 112, itemId: 'addon-city' });
});

test('object duplication preserves customization, layers, visibility and relative positions', () => {
  const scene = nestedScene(),
    before = structuredClone(scene);
  const result = duplicateBattlefieldObjects(
    scene,
    scene.placements.map(p => p.id),
  );
  const originals = new Map(scene.placements.map(p => [p.itemId, p]));
  const copies = result.scene.placements.filter(p => result.ids.includes(p.id));
  expect(result.ids).toHaveLength(3);
  expect(new Set(result.scene.placements.map(p => p.id)).size).toBe(6);
  for (const copy of copies) {
    const original = originals.get(copy.itemId)!;
    expect({
      ...copy,
      id: original.id,
      x: original.x,
      y: original.y,
      order: original.order,
    }).toEqual(original);
    expect(copy.x - original.x).toBe(24);
    expect(copy.y - original.y).toBe(24);
    const stack = battlefieldChildren(result.scene, copy.layerId);
    expect(stack.findIndex(p => p.id === copy.id)).toBeGreaterThan(
      stack.findIndex(p => p.id === original.id),
    );
  }
  expect(battlefieldCost(result.scene)).toBe(2 * battlefieldCost(scene) - 400);
  expect(scene).toEqual(before);
  const edge = {
    ...scene,
    placements: scene.placements.map((p, i) => ({ ...p, x: 1590 - i * 20, y: 390 - i * 20 })),
  };
  const shifted = duplicateBattlefieldObjects(
    edge,
    edge.placements.map(p => p.id),
  );
  expect(shifted.scene.placements.filter(p => shifted.ids.includes(p.id)).map(p => p.x)).toEqual([
    1566, 1546, 1526,
  ]);
});

test('duplicating a layer copies its full nested tree, mixed order and hidden contents as a sibling', () => {
  const scene = nestedScene(),
    before = structuredClone(scene);
  const result = duplicateBattlefieldLayer(scene, scene.layers[0].id);
  expect(result.scene.layers).toHaveLength(6);
  expect(result.ids).toHaveLength(3);
  const subtree = battlefieldLayerSubtree(result.scene, result.layerId);
  expect(subtree.size).toBe(3);
  const layers = result.scene.layers.filter(layer => subtree.has(layer.id));
  const root = layers.find(layer => layer.id === result.layerId)!;
  expect(root).toMatchObject({ name: 'Scene (copy)', parentId: null });
  const child = layers.find(layer => layer.name === 'Escort')!;
  const grandchild = layers.find(layer => layer.name === 'Hidden')!;
  expect(child.parentId).toBe(root.id);
  expect(grandchild.parentId).toBe(child.id);
  expect(grandchild.visible).toBe(false);
  const copies = result.scene.placements.filter(p => result.ids.includes(p.id));
  expect(copies.every(p => subtree.has(p.layerId))).toBe(true);
  expect(copies.find(p => p.itemId === 'ship-tie')).toMatchObject({
    visible: false,
    layerId: grandchild.id,
  });
  expect(battlefieldChildren(result.scene, root.id).map(p => p.kind)).toEqual(['object', 'layer']);
  expect(battlefieldCost(result.scene)).toBe(2 * battlefieldCost(scene) - 400);
  expect(scene).toEqual(before);
  const childCopy = duplicateBattlefieldLayer(scene, scene.layers[1].id);
  expect(childCopy.scene.layers.find(layer => layer.id === childCopy.layerId)?.parentId).toBe(
    scene.layers[0].id,
  );
});

test('empty folders duplicate and long copy names stay within the saved-name limit', () => {
  const scene = defaultBattlefieldScene();
  const result = duplicateBattlefieldLayer(scene, scene.layers[0].id);
  expect(result.ids).toHaveLength(0);
  expect(result.scene.layers).toHaveLength(2);
  expect(result.layerId).not.toBe(scene.layers[0].id);
  expect(battlefieldCopyName('x'.repeat(80))).toHaveLength(80);
  expect(battlefieldCopyName('🚀'.repeat(40))).toBe('🚀'.repeat(36) + ' (copy)');
});

test('edge-to-edge copies use any remaining space and report when no offset is possible', () => {
  const base = addBattlefieldObjects(defaultBattlefieldScene(), 'ship-tie', {
    layerId: defaultBattlefieldScene().layers[0].id,
    quantity: 2,
  }).scene;
  const edges = {
    ...base,
    placements: base.placements.map((p, i) => ({ ...p, x: i * 1600, y: i * 400 })),
  };
  const objects = duplicateBattlefieldObjects(
    edges,
    edges.placements.map(p => p.id),
  );
  expect(objects.overlapping).toBe(true);
  expect(
    objects.scene.placements.filter(p => objects.ids.includes(p.id)).map(p => [p.x, p.y]),
  ).toEqual([
    [0, 0],
    [1600, 400],
  ]);
  expect(duplicateBattlefieldLayer(edges, edges.placements[0].layerId).overlapping).toBe(true);
  const room = {
    ...base,
    placements: base.placements.map((p, i) => ({ ...p, x: 5 + i * 1590, y: 5 + i * 390 })),
  };
  const copies = duplicateBattlefieldObjects(
    room,
    room.placements.map(p => p.id),
  );
  expect(copies.overlapping).toBe(false);
  // Partial offsets still visibly move the selection; notify only on exact coincidence.
  const vertical = {
    ...edges,
    placements: edges.placements.map((p, i) => ({ ...p, y: i ? 395 : 10 })),
  };
  const partial = duplicateBattlefieldObjects(
    vertical,
    vertical.placements.map(p => p.id),
  );
  expect(partial.overlapping).toBe(false);
  expect(
    partial.scene.placements.filter(p => partial.ids.includes(p.id)).map(p => [p.x, p.y]),
  ).toEqual([
    [0, 0],
    [1600, 385],
  ]);
  expect(
    copies.scene.placements.filter(p => copies.ids.includes(p.id)).map(p => [p.x, p.y]),
  ).toEqual([
    [10, 10],
    [1600, 400],
  ]);
});

test('whole-scene copies remap every ID and parent without moving objects or sharing mutable state', () => {
  const source = nestedScene(),
    before = structuredClone(source);
  const copy = cloneBattlefieldScene(source);
  expect(battlefieldSceneSchema.safeParse(copy).success).toBe(true);
  expect(battlefieldCost(copy)).toBe(battlefieldCost(source));
  const oldIds = new Set([...source.layers, ...source.placements].map(record => record.id));
  expect([...copy.layers, ...copy.placements].every(record => !oldIds.has(record.id))).toBe(true);
  expect(
    copy.layers.map((layer, i) => ({
      ...layer,
      id: source.layers[i].id,
      parentId: source.layers[i].parentId,
    })),
  ).toEqual(source.layers);
  expect(
    copy.placements.map((p, i) => ({
      ...p,
      id: source.placements[i].id,
      layerId: source.placements[i].layerId,
    })),
  ).toEqual(source.placements);
  copy.light.x = 500;
  expect(source).toEqual(before);
});

test('invalid quantities and object/layer limits reject the whole operation without partial changes', () => {
  const base = defaultBattlefieldScene();
  for (const quantity of [0, -1, 1.5, NaN, Infinity, 51])
    expect(() =>
      addBattlefieldObjects(base, 'ship-x-wing', { layerId: base.layers[0].id, quantity }),
    ).toThrow('quantity');
  expect(() =>
    addBattlefieldObjects(base, 'ship-executor', { layerId: base.layers[0].id, quantity: 2 }),
  ).toThrow('quantity');
  expect(() => addBattlefieldObjects(base, 'planet', { layerId: crypto.randomUUID() })).toThrow(
    'layer',
  );
  const sample = addBattlefieldObjects(base, 'ship-x-wing', { layerId: base.layers[0].id }).scene
    .placements[0];
  const full = {
    ...base,
    placements: Array.from({ length: 800 }, () => ({ ...sample, id: crypto.randomUUID() })),
  };
  expect(() => addBattlefieldObjects(full, 'ship-x-wing', { layerId: base.layers[0].id })).toThrow(
    '800',
  );
  expect(() => duplicateBattlefieldObjects(full, [full.placements[0].id])).toThrow('800');
  expect(() => duplicateBattlefieldLayer(full, base.layers[0].id)).toThrow('800');
  expect(full.placements).toHaveLength(800);
  const folders = {
    ...base,
    layers: Array.from({ length: 256 }, (_, i) => ({
      ...base.layers[0],
      id: crypto.randomUUID(),
      order: i,
    })),
  };
  expect(() =>
    addBattlefieldObjects(folders, 'ship-tie', { quantity: 2, layerId: folders.layers[0].id }),
  ).toThrow('256');
  expect(() => duplicateBattlefieldLayer(folders, folders.layers[0].id)).toThrow('256');
  expect(folders.layers).toHaveLength(256);
});
