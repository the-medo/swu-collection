import { describe, expect, test } from 'bun:test';
import {
  battlefieldDrawOrder,
  moveBattlefieldObjects,
  reorderBattlefieldLayer,
  bringBattlefieldSelection,
  publicBattlefieldScene,
  deleteBattlefieldLayer,
  nestBattlefieldLayer,
  battlefieldLayerObjects,
  battlefieldLayerRows,
  battlefieldLayerIssue,
  canNestBattlefieldLayer,
  createBattlefieldLayer,
  battlefieldLayerTree,
  bringBattlefieldLayer,
} from './layers.ts';
import { normalizeBattlefieldScene } from './normalize.ts';
import {
  battlefieldSceneSchema,
  defaultBattlefieldScene,
  type LegacyBattlefieldScene,
  type BattlefieldScene,
  type FlatBattlefieldScene,
} from '../types/battlefield.ts';
import { battlefieldCost, repairBattlefieldScene } from './cost.ts';
const base = defaultBattlefieldScene();
const layerId = crypto.randomUUID();
const placement = (id: string, layer = base.layers[0].id, order = 0) => ({
  ...defaultBattlefieldScene(id).placements[0],
  itemId: 'ship-tie',
  textureId: undefined,
  scale: 1,
  layerId: layer,
  order,
});
const scene: BattlefieldScene = {
  ...base,
  layers: [...base.layers, { id: layerId, name: 'Fleet', visible: true, parentId: null, order: 1 }],
  placements: [
    placement('a'),
    placement('b', layerId),
    placement('c', base.layers[0].id, 1),
    placement('d', layerId, 1),
  ],
};
const order = (input: BattlefieldScene = scene) => battlefieldDrawOrder(input).map(p => p.id);

describe('Battlefield layers', () => {
  test('grouping uses the frontmost selected object parent even when the active layer has no selected objects', () => {
    const id = crypto.randomUUID();
    const grouped = createBattlefieldLayer(
      scene,
      { id, name: 'Selection', visible: true, parentId: layerId, order: 0 },
      ['a'],
    );
    expect(grouped.layers.find(layer => layer.id === id)!.parentId).toBe(base.layers[0].id);
    expect(order(grouped)).toEqual(order(scene));
    const mixed = createBattlefieldLayer(
      scene,
      { id, name: 'Mixed', visible: true, parentId: base.layers[0].id, order: 0 },
      ['a', 'b'],
    );
    expect(mixed.layers.find(layer => layer.id === id)!.parentId).toBe(layerId);
  });
  test('folder front/back actions reorder whole subtrees and work for empty folders', () => {
    const child = crypto.randomUUID();
    const nested: BattlefieldScene = {
      ...scene,
      layers: [
        ...scene.layers,
        { id: child, name: 'Wing', visible: true, parentId: layerId, order: 1 },
      ],
      placements: [
        ...scene.placements.map(p => (p.id === 'd' ? { ...p, order: 2 } : p)),
        placement('e', child),
      ],
    };
    expect(order(bringBattlefieldLayer(nested, child, true))).toEqual(['a', 'c', 'b', 'd', 'e']);
    expect(order(bringBattlefieldLayer(nested, child, false))).toEqual(['a', 'c', 'e', 'b', 'd']);
    expect(order(bringBattlefieldLayer(nested, layerId, false))).toEqual(['b', 'e', 'd', 'a', 'c']);
    const empty = { ...nested, placements: nested.placements.filter(p => p.id !== 'e') };
    const front = bringBattlefieldLayer(empty, child, true);
    expect(battlefieldLayerTree(front).children(layerId).at(-1)!.id).toBe(child);
    const wrapped = createBattlefieldLayer(
      empty,
      { id: crypto.randomUUID(), name: 'Empty group', visible: true, parentId: null, order: 0 },
      [],
      child,
    );
    expect(wrapped.layers.find(layer => layer.id === child)!.parentId).not.toBe(layerId);
    expect(order(wrapped)).toEqual(order(empty));
    expect(wrapped.placements.map(({ order: _order, ...p }) => p)).toEqual(
      empty.placements.map(({ order: _order, ...p }) => p),
    );
    expect(bringBattlefieldLayer(empty, 'missing', true)).toBe(empty);
  });
  test('grouping contiguous objects retains their stack position instead of lifting them above siblings', () => {
    const id = crypto.randomUUID();
    const grouped = createBattlefieldLayer(
      scene,
      { id, name: 'New squadron', visible: true, parentId: base.layers[0].id, order: 0 },
      ['a'],
    );
    expect(order(grouped)).toEqual(order(scene));
    expect(grouped.placements.find(p => p.id === 'a')!.layerId).toBe(id);
    expect(grouped.placements.find(p => p.id === 'c')!.layerId).toBe(base.layers[0].id);
    const both = createBattlefieldLayer(
      scene,
      { id, name: 'Both', visible: true, parentId: base.layers[0].id, order: 0 },
      ['a', 'c'],
    );
    expect(order(both)).toEqual(order(scene));
    expect(battlefieldLayerObjects(both, id).map(p => p.id)).toEqual(['a', 'c']);
  });
  test('wrapping a selected folder retains every sublayer and object membership, order and eye setting', () => {
    const child = crypto.randomUUID(),
      wrapper = crypto.randomUUID();
    const nested: BattlefieldScene = {
      ...scene,
      layers: [
        ...scene.layers,
        { id: child, name: 'Wing', visible: false, parentId: layerId, order: 1 },
      ],
      placements: [
        ...scene.placements.map(p => (p.id === 'd' ? { ...p, order: 2 } : p)),
        placement('e', child),
      ],
    };
    const wrapped = createBattlefieldLayer(
      nested,
      { id: wrapper, name: 'Fleet group', visible: true, parentId: layerId, order: 0 },
      battlefieldLayerObjects(nested, layerId).map(p => p.id),
      layerId,
    );
    expect(wrapped.layers.find(layer => layer.id === wrapper)!.parentId).toBeNull();
    expect(wrapped.layers.find(layer => layer.id === layerId)!.parentId).toBe(wrapper);
    expect(wrapped.layers.find(layer => layer.id === child)).toEqual(
      nested.layers.find(layer => layer.id === child),
    );
    expect(wrapped.placements).toEqual(nested.placements);
    expect(order(wrapped)).toEqual(order(nested));
    expect(battlefieldDrawOrder(wrapped, true).map(p => p.id)).toEqual(
      battlefieldDrawOrder(nested, true).map(p => p.id),
    );
    expect(battlefieldCost(wrapped)).toBe(battlefieldCost(nested));
  });
  test('repair cuts the cyclic edge while keeping descendants attached to their valid parents', () => {
    const a = crypto.randomUUID(),
      b = crypto.randomUUID(),
      c = crypto.randomUUID();
    const invalid: BattlefieldScene = {
      ...base,
      layers: [
        { id: a, name: 'Child', visible: true, parentId: b, order: 0 },
        { id: b, name: 'Fleet', visible: true, parentId: c, order: 0 },
        { id: c, name: 'Root', visible: true, parentId: b, order: 0 },
      ],
      placements: [placement('a', a)],
    };
    const repaired = repairBattlefieldScene(invalid);
    expect(repaired.layers.map(layer => layer.parentId)).toEqual([b, c, null]);
    expect(battlefieldLayerIssue(repaired)).toBeUndefined();
    expect(repaired.placements).toEqual(invalid.placements);
  });
  test('the indexed tree handles all 256 nested layers and 800 objects without losing descendants', () => {
    const layers = Array.from({ length: 256 }, (_, i) => ({
      id: crypto.randomUUID(),
      name: `Layer ${i}`,
      visible: true,
      parentId: null as string | null,
      order: 0,
    }));
    for (let i = 1; i < layers.length; i++) layers[i].parentId = layers[i - 1].id;
    const deep: BattlefieldScene = {
      ...base,
      layers,
      placements: Array.from({ length: 800 }, (_, i) => ({
        ...placement(crypto.randomUUID(), layers.at(-1)!.id),
        order: i,
      })),
    };
    const tree = battlefieldLayerTree(deep);
    expect(tree.rows()).toHaveLength(1056);
    expect(tree.objects(layers[0].id)).toHaveLength(800);
    expect(tree.objects(layers[0].id)).toBe(tree.objects(layers[0].id));
    expect(tree.subtree(layers[0].id).size).toBe(256);
    expect(battlefieldDrawOrder(deep, true)).toHaveLength(800);
    expect(battlefieldSceneSchema.safeParse(deep).success).toBe(true);
  });
  test('nested folders interleave with direct objects and retain world positions when reparented', () => {
    const child = crypto.randomUUID(),
      grandchild = crypto.randomUUID();
    const nested: BattlefieldScene = {
      ...scene,
      layers: [
        ...scene.layers,
        { id: child, name: 'Wing', visible: true, parentId: layerId, order: 1 },
        { id: grandchild, name: 'Squadron', visible: true, parentId: child, order: 0 },
      ],
      placements: [
        ...scene.placements.map(p => (p.id === 'd' ? { ...p, order: 2 } : p)),
        placement('e', grandchild),
      ],
    };
    expect(order(nested)).toEqual(['a', 'c', 'b', 'e', 'd']);
    expect(
      battlefieldLayerObjects(nested, layerId)
        .map(p => p.id)
        .sort(),
    ).toEqual(['b', 'd', 'e']);
    expect(
      battlefieldLayerRows(nested)
        .filter(row => row.kind === 'object')
        .map(row => [row.id, row.depth]),
    ).toEqual([
      ['d', 1],
      ['e', 3],
      ['b', 1],
      ['c', 1],
      ['a', 1],
    ]);
    expect(battlefieldLayerRows(nested, new Set([child])).some(row => row.id === 'e')).toBe(false);
    const moved = nestBattlefieldLayer(nested, child, base.layers[0].id);
    expect(order(moved)).toEqual(['a', 'c', 'e', 'b', 'd']);
    expect(moved.placements).toEqual(nested.placements);
    expect(moved.layers.find(layer => layer.id === grandchild)!.parentId).toBe(child);
    expect(order(reorderBattlefieldLayer(nested, child, 'b', false, 'object'))).toEqual([
      'a',
      'c',
      'e',
      'b',
      'd',
    ]);
    expect(order(moveBattlefieldObjects(nested, ['d'], layerId, child, false, 'layer'))).toEqual([
      'a',
      'c',
      'b',
      'd',
      'e',
    ]);
    expect(order(bringBattlefieldSelection(nested, ['b'], true))).toEqual([
      'a',
      'c',
      'e',
      'd',
      'b',
    ]);
    const root = nestBattlefieldLayer(nested, child, null);
    expect(root.layers.find(layer => layer.id === child)!.parentId).toBeNull();
    expect(root.placements).toEqual(nested.placements);
  });
  test('all ancestor eyes are inherited without changing individual visibility or cost', () => {
    const nested = nestBattlefieldLayer(scene, layerId, base.layers[0].id);
    const hidden: BattlefieldScene = {
      ...nested,
      layers: nested.layers.map(layer =>
        layer.id === base.layers[0].id ? { ...layer, visible: false } : layer,
      ),
      placements: nested.placements.map(p => (p.id === 'd' ? { ...p, visible: false } : p)),
    };
    expect(battlefieldDrawOrder(hidden, true)).toEqual([]);
    expect(battlefieldLayerRows(hidden).every(row => !row.visible)).toBe(true);
    expect(hidden.layers.find(layer => layer.id === layerId)!.visible).toBe(true);
    expect(battlefieldCost(hidden)).toBe(battlefieldCost(scene));
    const shown = { ...hidden, layers: nested.layers };
    expect(battlefieldDrawOrder(shown, true).map(p => p.id)).toEqual(['a', 'c', 'b']);
    expect(order(publicBattlefieldScene(shown))).toEqual(['a', 'c', 'b']);
    expect(publicBattlefieldScene(shown).layers).toEqual(base.layers);
  });
  test('cycles, self-parenting and missing parents are rejected and the repair preserves objects', () => {
    const nested = nestBattlefieldLayer(scene, layerId, base.layers[0].id);
    expect(canNestBattlefieldLayer(nested, base.layers[0].id, layerId)).toBe(false);
    expect(nestBattlefieldLayer(nested, base.layers[0].id, layerId)).toBe(nested);
    expect(nestBattlefieldLayer(nested, layerId, layerId)).toBe(nested);
    expect(reorderBattlefieldLayer(nested, base.layers[0].id, 'b', true, 'object')).toBe(nested);
    for (const parentId of [layerId, base.layers[0].id, crypto.randomUUID()]) {
      const invalid = {
        ...nested,
        layers: nested.layers.map(layer =>
          layer.id === base.layers[0].id ? { ...layer, parentId } : layer,
        ),
      };
      expect(battlefieldLayerIssue(invalid)).toBeDefined();
      expect(() => battlefieldCost(invalid)).toThrow();
      const repaired = repairBattlefieldScene(invalid);
      expect(battlefieldLayerIssue(repaired)).toBeUndefined();
      expect(battlefieldCost(repaired)).toBe(battlefieldCost(scene));
      expect(repaired.placements).toEqual(scene.placements);
      expect(repaired.layers.map(layer => layer.name)).toEqual(
        scene.layers.map(layer => layer.name),
      );
    }
  });
  test('deleting a sublayer unwraps nested contents at the same stack position and preserves visibility', () => {
    const child = crypto.randomUUID();
    const nested: BattlefieldScene = {
      ...nestBattlefieldLayer(scene, layerId, base.layers[0].id),
      layers: [
        ...nestBattlefieldLayer(scene, layerId, base.layers[0].id).layers,
        { id: child, name: 'Child', visible: true, parentId: layerId, order: 1 },
      ],
      placements: [
        ...scene.placements.map(p => (p.id === 'd' ? { ...p, order: 2 } : p)),
        placement('e', child),
      ],
    };
    for (const visible of [true, false]) {
      const source = {
        ...nested,
        layers: nested.layers.map(layer => (layer.id === layerId ? { ...layer, visible } : layer)),
      };
      const unwrapped = deleteBattlefieldLayer(source, layerId);
      expect(order(unwrapped)).toEqual(order(source));
      expect(battlefieldDrawOrder(unwrapped, true).map(p => p.id)).toEqual(
        battlefieldDrawOrder(source, true).map(p => p.id),
      );
      expect(unwrapped.layers.find(layer => layer.id === child)!.parentId).toBe(base.layers[0].id);
      expect(unwrapped.placements.find(p => p.id === 'e')!.layerId).toBe(child);
      expect(battlefieldCost(unwrapped)).toBe(battlefieldCost(source));
    }
    expect(deleteBattlefieldLayer(nested, base.layers[0].id)).toBe(nested);
  });
  test('existing flat layouts normalize into root layers with the same render order and visibility', () => {
    const flat: FlatBattlefieldScene = {
      ...scene,
      layers: scene.layers.map(({ parentId: _parentId, order: _order, ...layer }) => layer),
      placements: scene.placements.map(({ order: _order, ...p }) => p),
    };
    const upgraded = normalizeBattlefieldScene(flat);
    expect(order(upgraded)).toEqual(order(scene));
    expect(upgraded.layers.every(layer => layer.parentId === null)).toBe(true);
    expect(battlefieldCost(upgraded)).toBe(battlefieldCost(scene));
    expect(normalizeBattlefieldScene(upgraded)).toEqual(upgraded);
  });
  test('draw order respects folders and the stack within each folder', () => {
    expect(order()).toEqual(['a', 'c', 'b', 'd']);
    expect(order(reorderBattlefieldLayer(scene, layerId, base.layers[0].id, false))).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
    expect(reorderBattlefieldLayer(scene, layerId, layerId, true)).toBe(scene);
  });
  test('dragging up/down or into folders preserves world transforms and selection order', () => {
    const below = moveBattlefieldObjects(scene, ['d'], layerId, 'b', false);
    expect(order(below)).toEqual(['a', 'c', 'd', 'b']);
    expect(order(moveBattlefieldObjects(below, ['d'], layerId, 'b', true))).toEqual(order());
    const grouped = moveBattlefieldObjects(scene, ['a', 'c'], layerId);
    expect(order(grouped)).toEqual(['b', 'd', 'a', 'c']);
    expect(grouped.placements.find(p => p.id === 'a')).toMatchObject({
      ...scene.placements[0],
      layerId,
      order: 2,
    });
    expect(moveBattlefieldObjects(scene, ['a'], 'missing')).toBe(scene);
    expect(moveBattlefieldObjects(scene, ['a', 'c'], layerId, 'a')).toBe(scene);
    expect(order(bringBattlefieldSelection(scene, ['b'], true))).toEqual(['a', 'c', 'd', 'b']);
    expect(scene.placements.map(p => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  test('eyes filter drawing without losing contents or child visibility', () => {
    const hidden = {
      ...scene,
      layers: scene.layers.map(layer =>
        layer.id === layerId ? { ...layer, visible: false } : layer,
      ),
      placements: scene.placements.map(p => (p.id === 'c' ? { ...p, visible: false } : p)),
    };
    expect(battlefieldDrawOrder(hidden, true).map(p => p.id)).toEqual(['a']);
    expect(order(hidden)).toEqual(order());
    expect(battlefieldDrawOrder({ ...hidden, layers: scene.layers }, true).map(p => p.id)).toEqual([
      'a',
      'b',
      'd',
    ]);
    expect(battlefieldCost(hidden)).toBe(1000);
  });
  test('public scenes flatten visible artwork and omit private names and hidden objects', () => {
    const privateScene = {
      ...scene,
      layers: scene.layers.map(layer => ({ ...layer, name: 'Private fleet plan' })),
      placements: scene.placements.map(p => (p.id === 'b' ? { ...p, visible: false } : p)),
    };
    const publicScene = publicBattlefieldScene(privateScene);
    expect(publicScene.layers).toEqual(base.layers);
    expect(order(publicScene)).toEqual(['a', 'c', 'd']);
    expect(publicScene.placements.every(p => p.layerId === base.layers[0].id && p.visible)).toBe(
      true,
    );
    expect(JSON.stringify(publicScene)).not.toContain('Private fleet plan');
    expect(
      publicBattlefieldScene({
        ...privateScene,
        layers: privateScene.layers.map(layer => ({ ...layer, visible: false })),
      }).placements,
    ).toHaveLength(0);
    expect(publicScene.backgroundId).toBe(privateScene.backgroundId);
  });
  test('deleting top, middle or bottom layers merges adjacent contents in the same visual order', () => {
    const topId = crypto.randomUUID();
    const source = {
      ...scene,
      layers: [
        ...scene.layers,
        { id: topId, name: 'Top', visible: true, parentId: null, order: 2 },
      ],
      placements: [...scene.placements, placement('e', topId)],
    };
    for (const layer of source.layers) {
      const merged = deleteBattlefieldLayer(source, layer.id);
      expect(order(merged)).toEqual(order(source));
      expect(merged.layers).toHaveLength(2);
      expect(merged.layers.some(value => value.id === layer.id)).toBe(false);
      expect(battlefieldCost(merged)).toBe(battlefieldCost(source));
    }
    expect(deleteBattlefieldLayer(base, base.layers[0].id)).toBe(base);
    expect(deleteBattlefieldLayer(source, 'missing')).toBe(source);
  });
  test('merging visible/hidden layers preserves visible artwork and individual eye states', () => {
    for (const below of [false, true])
      for (const above of [false, true]) {
        const source = {
          ...scene,
          layers: scene.layers.map((layer, i) => ({ ...layer, visible: i === 0 ? below : above })),
          placements: scene.placements.map(p => (p.id === 'c' ? { ...p, visible: false } : p)),
        };
        for (const layer of source.layers) {
          const merged = deleteBattlefieldLayer(source, layer.id);
          expect(battlefieldDrawOrder(merged, true).map(p => p.id)).toEqual(
            battlefieldDrawOrder(source, true).map(p => p.id),
          );
          expect(merged.placements.find(p => p.id === 'c')!.visible).toBe(false);
          expect(merged.placements).toHaveLength(4);
        }
      }
  });
  test('legacy groups and attached add-ons become editable layers and individual copies', () => {
    const groupId = crypto.randomUUID();
    const parent = {
      id: crypto.randomUUID(),
      itemId: 'planet',
      x: 500,
      y: 200,
      rotation: 90,
      scale: 1,
      colorId: 'color-gold',
      groupId,
      addonIds: ['addon-city', 'addon-ion'],
    };
    const legacy: LegacyBattlefieldScene = {
      width: 1600,
      height: 400,
      backgroundId: 'background-default',
      placements: [
        parent,
        { ...parent, id: crypto.randomUUID(), x: 1000 },
        {
          ...parent,
          id: crypto.randomUUID(),
          itemId: 'ship-tie',
          groupId: null,
          addonIds: [],
          scale: 2,
        },
      ],
    };
    const normalized = normalizeBattlefieldScene(legacy);
    expect(battlefieldSceneSchema.safeParse(normalized).success).toBe(true);
    expect(normalized.layers.map(layer => layer.id)).toEqual([base.layers[0].id, groupId]);
    expect(normalized.placements).toHaveLength(7);
    expect(normalized.placements[1]).toMatchObject({
      itemId: 'addon-city',
      x: 478,
      y: 168,
      rotation: 70,
      scale: 4 / 3,
      layerId: groupId,
      visible: true,
    });
    expect(normalized.placements[2]).toMatchObject({
      itemId: 'addon-ion',
      x: 536,
      y: 236,
      rotation: 65,
      layerId: groupId,
    });
    expect(normalized.placements[6].scale).toBe(1);
    expect(new Set(normalized.placements.map(p => p.id)).size).toBe(7);
    expect(normalizeBattlefieldScene(legacy)).toEqual(normalized);
    expect(normalizeBattlefieldScene(normalized)).toEqual(normalized);
    expect(battlefieldCost(normalized)).toBe(1000 * 2 + 1200 * 2 + 1000 * 2 + 250 + 400);
    expect(legacy.placements[2].scale).toBe(2);
  });
  test('a full legacy layout can convert all its add-ons without exceeding the new contract', () => {
    const legacy: LegacyBattlefieldScene = {
      width: 1600,
      height: 400,
      backgroundId: 'background-default',
      placements: Array.from({ length: 200 }, () => ({
        id: crypto.randomUUID(),
        itemId: 'planet',
        x: 1599,
        y: 399,
        rotation: 355,
        scale: 3,
        colorId: 'color-default',
        groupId: crypto.randomUUID(),
        addonIds: ['addon-city', 'addon-ion', 'addon-mining'],
      })),
    };
    const normalized = normalizeBattlefieldScene(legacy);
    expect(normalized.placements).toHaveLength(800);
    expect(normalized.layers).toHaveLength(201);
    expect(battlefieldSceneSchema.safeParse(normalized).success).toBe(true);
  });
});
