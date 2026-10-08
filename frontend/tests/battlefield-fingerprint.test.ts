import { describe, expect, test } from 'bun:test';
import { battlefieldFingerprint } from '../src/components/app/battlefield/battlefieldFingerprint';
import {
  defaultBattlefieldScene,
  battlefieldDefaultLight,
  type BattlefieldLayer,
  type BattlefieldPlacement,
} from '../../shared/types/battlefield.ts';

const planetId = '10000000-0000-4000-8000-000000000001';
const shipId = '10000000-0000-4000-8000-000000000002';
const layerId = '10000000-0000-4000-8000-000000000003';
const newId = '10000000-0000-4000-8000-000000000004';

function fixture() {
  const scene = defaultBattlefieldScene(planetId);
  scene.layers.push({ id: layerId, name: 'Empty layer', parentId: null, visible: true, order: 1 });
  scene.placements.push({
    ...scene.placements[0],
    id: shipId,
    itemId: 'ship-x-wing',
    order: 1,
  });
  return scene;
}
const reversedKeys = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).reverse()) as T;

describe('Battlefield fingerprints', () => {
  test('JSONB key order and record array order do not change a saved layout', () => {
    const scene = fixture();
    const reordered = reversedKeys({
      ...scene,
      light: reversedKeys(scene.light),
      layers: scene.layers.toReversed().map(reversedKeys),
      placements: scene.placements.toReversed().map(reversedKeys),
    });
    expect(battlefieldFingerprint('Fleet', reordered)).toBe(battlefieldFingerprint('Fleet', scene));
  });

  test('names, backgrounds, lighting and preset factions affect dirty state', () => {
    const scene = fixture();
    const saved = battlefieldFingerprint('Fleet', scene, ['rebel']);
    expect(battlefieldFingerprint('Fleet ', scene, ['rebel'])).not.toBe(saved);
    expect(
      battlefieldFingerprint('Fleet', { ...scene, backgroundId: 'background-nebula' }, ['rebel']),
    ).not.toBe(saved);
    for (const axis of ['x', 'y'] as const)
      expect(
        battlefieldFingerprint(
          'Fleet',
          {
            ...scene,
            light: { ...scene.light, [axis]: scene.light[axis] + 1 },
          },
          ['rebel'],
        ),
      ).not.toBe(saved);
    expect(battlefieldFingerprint('Fleet', scene, ['imperial'])).not.toBe(saved);
    expect(battlefieldFingerprint('Fleet', scene, ['rebel', 'republic'])).toBe(
      battlefieldFingerprint('Fleet', scene, ['republic', 'rebel']),
    );
  });

  test('missing optional surface and light values match their saved defaults', () => {
    const scene = fixture();
    const missing = structuredClone(scene);
    delete missing.placements[0].textureId;
    delete missing.placements[1].textureId;
    delete (missing as Partial<typeof missing>).light;
    expect(battlefieldFingerprint('', missing)).toBe(
      battlefieldFingerprint('', { ...scene, light: { ...battlefieldDefaultLight } }),
    );
  });

  const placementChanges = {
    id: newId,
    itemId: 'asteroid-rock',
    x: 200,
    y: 100,
    rotation: 45,
    scale: 1,
    colorId: 'color-gold',
    textureId: 'ocean',
    layerId,
    visible: false,
    order: 2,
  } satisfies { [Key in keyof BattlefieldPlacement]-?: BattlefieldPlacement[Key] };
  test('the placement cases cover all persisted fields', () => {
    expect(Object.keys(fixture().placements[0]).sort()).toEqual(
      Object.keys(placementChanges).sort(),
    );
  });
  for (const [key, value] of Object.entries(placementChanges))
    test(`a placement ${key} change affects dirty state`, () => {
      const scene = fixture();
      const changed = {
        ...scene,
        placements: scene.placements.map(p => (p.id === planetId ? { ...p, [key]: value } : p)),
      };
      expect(battlefieldFingerprint('', changed)).not.toBe(battlefieldFingerprint('', scene));
    });

  const layerChanges = {
    id: newId,
    name: 'Renamed layer',
    visible: false,
    parentId: layerId,
    order: 2,
  } satisfies { [Key in keyof BattlefieldLayer]-?: BattlefieldLayer[Key] };
  test('the layer cases cover all persisted fields', () => {
    expect(Object.keys(fixture().layers[0]).sort()).toEqual(Object.keys(layerChanges).sort());
  });
  for (const [key, value] of Object.entries(layerChanges))
    test(`a layer ${key} change affects dirty state`, () => {
      const scene = fixture();
      const changed = {
        ...scene,
        layers: scene.layers.map((layer, i) => (i === 0 ? { ...layer, [key]: value } : layer)),
      };
      expect(battlefieldFingerprint('', changed)).not.toBe(battlefieldFingerprint('', scene));
    });

  test('empty-layer nesting is dirty even when the artwork has not changed', () => {
    const scene = fixture();
    const nested = {
      ...scene,
      layers: scene.layers.map(layer =>
        layer.id === layerId ? { ...layer, parentId: scene.layers[0].id } : layer,
      ),
    };
    expect(nested.placements).toEqual(scene.placements);
    expect(battlefieldFingerprint('', nested)).not.toBe(battlefieldFingerprint('', scene));
  });

  test('repairing duplicate layers or orphaned objects is dirty', () => {
    const scene = fixture();
    const duplicated = { ...scene, layers: [...scene.layers, { ...scene.layers[0] }] };
    const orphaned = {
      ...scene,
      placements: [...scene.placements, { ...scene.placements[0], id: newId, layerId: newId }],
    };
    expect(battlefieldFingerprint('', duplicated)).not.toBe(battlefieldFingerprint('', scene));
    expect(battlefieldFingerprint('', orphaned)).not.toBe(battlefieldFingerprint('', scene));
  });
});
