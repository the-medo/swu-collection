import { describe, expect, test } from 'bun:test';
import { battlefieldCost, battlefieldObjectCost, repairBattlefieldScene } from './cost.ts';
import { normalizeBattlefieldScene } from './normalize.ts';
import { defaultBattlefieldScene } from '../types/battlefield.ts';
import { battlefieldCatalog, battlefieldItems } from './catalog.ts';
import { battlefieldPlanetTextureIds } from './planets.ts';
import { battlefieldSceneSchema } from '../types/battlefield.ts';
const placement = (itemId = 'ship-tie') => ({
  ...defaultBattlefieldScene(crypto.randomUUID()).placements[0],
  itemId,
  scale: 1,
  textureId: itemId === 'planet' ? ('rocky' as const) : undefined,
});
describe('Battlefield credit budget', () => {
  test('objects and add-ons count per copy; used colors count once per layout', () => {
    const planets = [placement('planet'), placement('planet')].map(p => ({
      ...p,
      colorId: 'color-gold',
    }));
    const scene = {
      ...defaultBattlefieldScene(),
      backgroundId: 'background-nebula',
      placements: [
        ...planets,
        placement(),
        placement(),
        placement('addon-city'),
        placement('addon-city'),
        placement('addon-ion'),
      ],
    };
    expect(battlefieldCost(scene)).toBe(700 + 1000 + 1000 + 250 + 250 + 400 + 1200 * 2 + 1000);
    // Removing the last user of a color releases its budget cost.
    expect(battlefieldCost({ ...scene, placements: scene.placements.slice(2, 4) })).toBe(1200);
    expect(battlefieldCost(defaultBattlefieldScene())).toBe(0);
  });
  test('hidden objects and layers still consume the full budget', () => {
    const scene = {
      ...defaultBattlefieldScene(),
      placements: [placement('addon-city'), placement('addon-city')],
    };
    expect(
      battlefieldCost({
        ...scene,
        placements: scene.placements.map(p => ({ ...p, visible: false })),
        layers: scene.layers.map(layer => ({ ...layer, visible: false })),
      }),
    ).toBe(2400);
  });
  test('every catalog object is usable without purchase or ownership records', () => {
    for (const item of battlefieldCatalog.filter(i => i.kind === 'object'))
      expect(
        battlefieldCost({ ...defaultBattlefieldScene(), placements: [placement(item.id)] }),
      ).toBe(item.cost);
  });
  test('planets and asteroids pay for area, with a base-price floor and whole credits', () => {
    for (const itemId of ['planet', 'asteroid-rock']) {
      const p = placement(itemId);
      const base = battlefieldObjectCost(p);
      for (const scale of [0.2, 0.5, 0.95, 1])
        expect(battlefieldObjectCost({ ...p, scale })).toBe(base);
      expect(battlefieldObjectCost({ ...p, scale: 1.5 })).toBe(base * 2.25);
      expect(battlefieldObjectCost({ ...p, scale: 2 })).toBe(base * 4);
      expect(battlefieldObjectCost({ ...p, scale: 3 })).toBe(base * 9);
    }
    expect(battlefieldObjectCost({ ...placement('planet'), scale: 1.05 })).toBe(1103);
    expect(battlefieldObjectCost({ ...placement('asteroid-rock'), scale: 1.1 })).toBe(363);
    expect(battlefieldObjectCost({ ...placement('asteroid-rock'), scale: 1.11 })).toBe(370);
    expect(battlefieldCost(defaultBattlefieldScene(crypto.randomUUID()))).toBe(3610);
    const planet = { ...placement('planet'), scale: 2 };
    expect(
      battlefieldCost({
        ...defaultBattlefieldScene(),
        placements: [planet, placement('addon-city')],
      }),
    ).toBe(5200);
  });
  test('Death Star matches the planet size and grows from 200k to 400k with area up to 300%', () => {
    const item = battlefieldItems['station-death-star']!;
    expect([item.width, item.height]).toEqual([
      battlefieldItems.planet!.width,
      battlefieldItems.planet!.height,
    ]);
    const deathStar = placement(item.id);
    for (const [scale, expected] of [
      [0.2, 200000],
      [0.5, 200000],
      [1, 200000],
      [1.05, 202563],
      [1.5, 231250],
      [2, 275000],
      [2.5, 331250],
      [3, 400000],
    ]) {
      const scene = { ...defaultBattlefieldScene(), placements: [{ ...deathStar, scale }] };
      expect(battlefieldSceneSchema.parse(scene)).toEqual(scene);
      expect(battlefieldCost(scene)).toBe(expected);
      expect(normalizeBattlefieldScene(scene).placements[0].scale).toBe(scale);
    }
    expect(
      battlefieldCost({
        ...defaultBattlefieldScene(),
        placements: [deathStar, { ...placement(item.id), scale: 2 }],
      }),
    ).toBe(475000);
    // The cap is per Death Star, so multiple copies still consume their own budgets.
    expect(
      battlefieldCost({
        ...defaultBattlefieldScene(),
        placements: [deathStar, placement(item.id)].map(p => ({ ...p, scale: 3 })),
      }),
    ).toBe(800000);
    for (const scale of [NaN, Infinity, -1, 0, 0.1, 3.01, 5, 10]) {
      expect(() => battlefieldObjectCost({ ...deathStar, scale })).toThrow('object size');
      expect(
        battlefieldSceneSchema.safeParse({
          ...defaultBattlefieldScene(),
          placements: [{ ...deathStar, scale }],
        }).success,
      ).toBe(false);
    }
    // The Death Star's pricing must not alter the other objects' size limits.
    for (const other of battlefieldCatalog.filter(i => i.kind === 'object' && i.id !== item.id))
      expect(() => battlefieldObjectCost({ ...placement(other.id), scale: 3.05 })).toThrow();
  });
  test('ships can shrink without a price discount, but cannot exceed their model size', () => {
    // Every hull family, including new capital ships, obeys the same size and budget rules.
    for (const item of battlefieldCatalog.filter(item => item.category === 'Ships')) {
      for (const scale of [0.2, 0.5, 1])
        expect(battlefieldObjectCost({ ...placement(item.id), scale })).toBe(item.cost);
      expect(() => battlefieldObjectCost({ ...placement(item.id), scale: 1.01 })).toThrow(
        '20–100%',
      );
    }
    const ship = { ...placement(), scale: 2 };
    for (const scale of [0.2, 0.5, 0.95, 1])
      expect(battlefieldObjectCost({ ...ship, scale })).toBe(250);
    for (const scale of [1.05, 1.5, 2, 3])
      expect(() => battlefieldObjectCost({ ...ship, scale })).toThrow('20–100%');
    const planet = { ...placement('planet'), scale: 1.5 };
    const scene = { ...defaultBattlefieldScene(), placements: [ship, planet] };
    const normalized = normalizeBattlefieldScene(scene);
    expect(normalized.placements).toEqual([{ ...ship, scale: 1 }, planet]);
    expect(normalizeBattlefieldScene(normalized)).toEqual(normalized);
    expect(battlefieldCost(normalized)).toBe(2500);
    expect(scene.placements[0].scale).toBe(2);
    expect(repairBattlefieldScene(scene)).toEqual(normalized);
    const distantShip = { ...ship, scale: 0.5 };
    expect(normalizeBattlefieldScene({ ...scene, placements: [distantShip] }).placements).toEqual([
      distantShip,
    ]);
  });
  test('fleet sizes preserve escort ordering, the 400px cap and Star Destroyer prices', () => {
    for (const ship of battlefieldCatalog.filter(item => item.category === 'Ships')) {
      expect(ship.width!, ship.name + ' native length').toBeGreaterThan(0);
      expect(ship.width!, ship.name + ' fits the maximum hull size').toBeLessThanOrEqual(400);
      expect(ship.height!, ship.name + ' fits the Battlefield height').toBeLessThanOrEqual(400);
      if (['destroyer', 'venator', 'resurgent', 'executor'].includes(ship.shape!))
        expect(ship.cost, ship.name + ' Star Destroyer minimum price').toBeGreaterThanOrEqual(
          10000,
        );
    }
    expect(battlefieldItems['ship-executor']!.cost).toBe(70000);
    expect(battlefieldItems['ship-executor']!.width).toBe(400);
    expect(battlefieldItems['ship-tantive-iv']!.width).toBe(40);
    expect(battlefieldItems['ship-corvette']!.width).toBe(40);
    // Readable escort sizes keep the order of the hull lengths: Hammerhead ~117m,
    // CR90/Raider ~150m, Nebulon-B ~300m, and Gideon's larger light cruiser.
    for (const escort of ['ship-tantive-iv', 'ship-corvus']) {
      expect(battlefieldItems['ship-lightmaker']!.width!).toBeLessThan(
        battlefieldItems[escort]!.width!,
      );
      expect(battlefieldItems[escort]!.width!).toBeLessThan(
        battlefieldItems['ship-redemption']!.width!,
      );
    }
    expect(battlefieldItems['ship-redemption']!.width!).toBeLessThan(
      battlefieldItems['ship-gideons-light-cruiser']!.width!,
    );
    expect(battlefieldItems['ship-gideons-light-cruiser']!.width!).toBeLessThan(
      battlefieldItems['ship-resolute']!.width!,
    );
  });
  test('one Planet model supports every surface at the same base size and price', () => {
    expect(battlefieldCatalog.filter(item => item.category === 'Planets')).toHaveLength(1);
    for (const textureId of battlefieldPlanetTextureIds) {
      const scene = {
        ...defaultBattlefieldScene(),
        placements: [{ ...placement('planet'), textureId }],
      };
      expect(battlefieldSceneSchema.parse(scene)).toEqual(scene);
      expect(battlefieldCost(scene)).toBe(1000);
    }
    expect(
      battlefieldSceneSchema.safeParse({
        ...defaultBattlefieldScene(),
        placements: [{ ...placement('planet'), textureId: 'unknown' }],
      }).success,
    ).toBe(false);
    for (const item of battlefieldCatalog.filter(i => i.kind === 'object' && i.shape !== 'planet'))
      expect(() => battlefieldObjectCost({ ...placement(item.id), textureId: 'gas' })).toThrow(
        'valid planet surface',
      );
  });
  test('invalid sizes cannot bypass the area price', () => {
    for (const scale of [NaN, Infinity, -1, 0, 0.1, 3.1])
      expect(() => battlefieldObjectCost({ ...placement('planet'), scale })).toThrow('object size');
  });
  test('rejects unknown IDs, wrong item kinds, duplicate IDs and missing layers', () => {
    const p = placement();
    const scene = { ...defaultBattlefieldScene(), placements: [p] };
    for (const itemId of ['unknown', 'constructor', 'toString', 'color-gold'])
      expect(() => battlefieldCost({ ...scene, placements: [{ ...p, itemId }] })).toThrow(
        'valid Battlefield object',
      );
    expect(() => battlefieldCost({ ...scene, backgroundId: 'ship-tie' })).toThrow(
      'valid background',
    );
    expect(() =>
      battlefieldCost({ ...scene, placements: [{ ...p, colorId: 'ship-tie' }] }),
    ).toThrow('valid object color');
    expect(() => battlefieldCost({ ...scene, placements: [p, p] })).toThrow('unique placement');
    expect(() =>
      battlefieldCost({ ...scene, placements: [{ ...p, layerId: crypto.randomUUID() }] }),
    ).toThrow('existing layer');
    expect(() => battlefieldCost({ ...scene, layers: [scene.layers[0], scene.layers[0]] })).toThrow(
      'unique ID',
    );
  });
  test('older layouts can be repaired without losing valid objects or their transforms', () => {
    const planet = {
      ...placement('planet'),
      colorId: 'retired-color',
    };
    const retired = placement('retired-ship');
    const scene = {
      ...defaultBattlefieldScene(),
      backgroundId: 'retired-background',
      placements: [planet, retired, planet],
    };
    expect(() => battlefieldCost(scene)).toThrow();
    const repaired = repairBattlefieldScene(scene);
    expect(repaired).toEqual({
      ...scene,
      backgroundId: 'background-default',
      placements: [{ ...planet, colorId: 'color-default' }],
    });
    expect(battlefieldCost(repaired)).toBe(1000);
    expect(scene.placements).toHaveLength(3);
  });
});
