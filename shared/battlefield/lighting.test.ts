import { describe, expect, test } from 'bun:test';
import {
  battlefieldLightDirection,
  moveBattlefieldLight,
  battlefieldLightInFrame,
  animatedBattlefieldLight,
  battlefieldLightMotionPeriod,
} from './lighting.ts';
import { normalizeBattlefieldScene } from './normalize.ts';
import { publicBattlefieldScene } from './layers.ts';
import { battlefieldCost } from './cost.ts';
import {
  battlefieldDefaultLight,
  battlefieldLightSchema,
  battlefieldSceneSchema,
  defaultBattlefieldScene,
  type LegacyBattlefieldScene,
} from '../types/battlefield.ts';

describe('Battlefield main light', () => {
  test('one runtime source between two boards lights their facing sides', () => {
    const world = { x: 800, y: 500 };
    const top = battlefieldLightInFrame(world, { x: 0, y: 0, width: 1600, height: 400 });
    const bottom = battlefieldLightInFrame(world, { x: 0, y: 600, width: 1600, height: 400 });
    expect(top).toEqual({ x: 800, y: 500 });
    expect(bottom).toEqual({ x: 800, y: -100 });
    const p = { x: 800, y: 200, rotation: 0 };
    expect(battlefieldLightDirection(p, top)).toEqual({ x: 0, y: 1 });
    expect(battlefieldLightDirection(p, bottom)).toEqual({ x: 0, y: -1 });
    // Translated and scaled board frames preserve the same shared world point.
    expect(
      battlefieldLightInFrame({ x: 500, y: 300 }, { x: 100, y: 50, width: 800, height: 200 }),
    ).toEqual(top);
    expect(
      battlefieldLightInFrame({ x: 500, y: 300 }, { x: 100, y: 350, width: 800, height: 200 }),
    ).toEqual(bottom);
    expect(world).toEqual({ x: 800, y: 500 });
  });

  test('runtime frame conversion rejects zero dimensions and invalid coordinates', () => {
    const frame = { x: 0, y: 0, width: 1600, height: 400 };
    for (const bad of [
      { ...frame, width: 0 },
      { ...frame, height: -1 },
      { ...frame, x: NaN },
      { ...frame, width: Infinity },
    ]) {
      expect(() => battlefieldLightInFrame({ x: 800, y: 500 }, bad)).toThrow(RangeError);
    }
    expect(() => battlefieldLightInFrame({ x: Infinity, y: 0 }, frame)).toThrow(RangeError);
  });

  test('shared sources account for letterboxing and boards facing each other', () => {
    const world = { x: 500, y: 600 };
    // The 800x200 artwork is centered vertically inside this square viewport.
    expect(battlefieldLightInFrame(world, { x: 100, y: 50, width: 800, height: 800 })).toEqual({
      x: 800,
      y: 500,
    });
    // A wide viewport instead centers the artwork horizontally.
    expect(
      battlefieldLightInFrame({ x: 900, y: 300 }, { x: 100, y: 50, width: 1600, height: 200 }),
    ).toEqual({ x: 800, y: 500 });
    const source = { x: 800, y: 500 };
    const flipped = battlefieldLightInFrame(source, {
      x: 0,
      y: 600,
      width: 1600,
      height: 400,
      rotation: 180,
    });
    expect(flipped).toEqual({ x: 800, y: 500 });
    expect(battlefieldLightDirection({ x: 800, y: 200, rotation: 0 }, flipped)).toEqual({
      x: 0,
      y: 1,
    });
  });

  test('profile motion begins at the saved pose, loops smoothly and never changes scene data', () => {
    const scene = defaultBattlefieldScene(crypto.randomUUID());
    const saved = structuredClone(scene);
    const period = battlefieldLightMotionPeriod;
    expect(animatedBattlefieldLight(scene.light, 0)).toEqual(scene.light);
    expect(animatedBattlefieldLight(scene.light, period)).toEqual(scene.light);
    expect(animatedBattlefieldLight(scene.light, period / 4).x).toBeCloseTo(scene.light.x + 640, 8);
    expect(animatedBattlefieldLight(scene.light, period / 2).y).toBeCloseTo(scene.light.y + 600, 8);
    for (const elapsed of [0, 200, 1000, period / 4, period - 1, period * 1000 + 42]) {
      const light = animatedBattlefieldLight(scene.light, elapsed);
      expect(animatedBattlefieldLight(scene.light, elapsed + period).x).toBeCloseTo(light.x, 8);
      expect(animatedBattlefieldLight(scene.light, elapsed + period).y).toBeCloseTo(light.y, 8);
      expect(Number.isFinite(light.x) && Number.isFinite(light.y)).toBe(true);
    }
    const start = animatedBattlefieldLight(scene.light, 0);
    const before = animatedBattlefieldLight(scene.light, period - 1);
    const after = animatedBattlefieldLight(scene.light, 1);
    expect(Math.hypot(before.x - start.x, before.y - start.y)).toBeLessThan(0.05);
    expect(Math.hypot(after.x - start.x, after.y - start.y)).toBeLessThan(0.05);
    expect(scene).toEqual(saved);
  });

  test('all objects share a world-space source that stays consistent through rotation', () => {
    for (const rotation of [0, 90, 180, 270, 330]) {
      const p = { x: 800, y: 200, rotation };
      for (const light of [
        { x: 0, y: 200 },
        { x: 1600, y: 200 },
        { x: 800, y: 0 },
        { x: 800, y: 400 },
        { x: 200, y: 60 },
      ]) {
        const direction = battlefieldLightDirection(p, light);
        const angle = (rotation * Math.PI) / 180;
        const worldX = direction.x * Math.cos(angle) - direction.y * Math.sin(angle);
        const worldY = direction.x * Math.sin(angle) + direction.y * Math.cos(angle);
        const distance = Math.hypot(light.x - p.x, light.y - p.y);
        expect(worldX).toBeCloseTo((light.x - p.x) / distance, 10);
        expect(worldY).toBeCloseTo((light.y - p.y) / distance, 10);
        expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1, 10);
      }
    }
    expect(battlefieldLightDirection({ x: 400, y: 200, rotation: 0 }, { x: 800, y: 200 }).x).toBe(
      1,
    );
    expect(battlefieldLightDirection({ x: 1200, y: 200, rotation: 0 }, { x: 800, y: 200 }).x).toBe(
      -1,
    );
  });

  test('a source centered on an object has a finite, stable world direction', () => {
    for (const rotation of [0, 90, 330]) {
      const direction = battlefieldLightDirection({ x: 300, y: 100, rotation }, { x: 300, y: 100 });
      expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1, 10);
      expect(Number.isFinite(direction.x) && Number.isFinite(direction.y)).toBe(true);
    }
  });

  test('moving and nudging the handle clamps to the scene without mutating history', () => {
    const light = { x: 200, y: 60 };
    expect(moveBattlefieldLight(light, 10, -1)).toEqual({ x: 210, y: 59 });
    expect(moveBattlefieldLight(light, -10000, 10000)).toEqual({ x: 0, y: 400 });
    expect(moveBattlefieldLight(light, 10000, -10000)).toEqual({ x: 1600, y: 0 });
    expect(light).toEqual({ x: 200, y: 60 });
  });

  test('strict light coordinates reject invalid saves and accept the scene edges', () => {
    for (const light of [
      { x: -1, y: 60 },
      { x: 1601, y: 60 },
      { x: 200, y: -1 },
      { x: 200, y: 401 },
      { x: NaN, y: 60 },
      { x: Infinity, y: 60 },
      { x: '200', y: 60 },
      { x: 200 },
      { x: 200, y: 60, visible: true },
      null,
    ])
      expect(battlefieldLightSchema.safeParse(light).success).toBe(false);
    expect(battlefieldLightSchema.parse({ x: 0, y: 400 })).toEqual({ x: 0, y: 400 });
    expect(battlefieldLightSchema.parse({ x: 1600, y: 0 })).toEqual({ x: 1600, y: 0 });
  });

  test('older nested scenes and clients gain stable default lighting without changing objects', () => {
    const scene = defaultBattlefieldScene(crypto.randomUUID());
    const child = {
      ...scene.layers[0],
      id: crypto.randomUUID(),
      parentId: scene.layers[0].id,
      name: 'Fleet',
    };
    const old = {
      width: scene.width,
      height: scene.height,
      backgroundId: scene.backgroundId,
      layers: [...scene.layers, child],
      placements: scene.placements.map(p => ({ ...p, layerId: child.id })),
    };
    const normalized = normalizeBattlefieldScene(old);
    expect(normalized).toEqual({ ...old, light: battlefieldDefaultLight });
    expect(normalizeBattlefieldScene(normalized)).toEqual(normalized);
    expect(battlefieldSceneSchema.parse(old)).toEqual(normalized);
    expect('light' in old).toBe(false);
    normalized.light.x = 500;
    expect(battlefieldDefaultLight.x).toBe(200);
    expect(defaultBattlefieldScene().light.x).toBe(200);
  });

  test('flat and legacy group layouts also gain the same default source', () => {
    const scene = defaultBattlefieldScene(crypto.randomUUID());
    const flat = {
      width: scene.width,
      height: scene.height,
      backgroundId: scene.backgroundId,
      layers: scene.layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
      })),
      placements: scene.placements.map(({ order: _order, ...p }) => p),
    };
    expect(normalizeBattlefieldScene(flat)).toEqual(scene);
    const legacy: LegacyBattlefieldScene = {
      width: scene.width,
      height: scene.height,
      backgroundId: scene.backgroundId,
      placements: scene.placements.map(
        ({ layerId: _layer, visible: _visible, order: _order, ...p }) => ({
          ...p,
          addonIds: [],
          groupId: null,
        }),
      ),
    };
    expect(normalizeBattlefieldScene(legacy)).toEqual(scene);
  });

  test('public shading preserves the saved source while hiding private layers and objects', () => {
    const scene = defaultBattlefieldScene(crypto.randomUUID());
    const hidden = { ...scene.placements[0], id: crypto.randomUUID(), visible: false };
    const privateScene = {
      ...scene,
      light: { x: 1400, y: 300 },
      placements: [...scene.placements, hidden],
    };
    const published = publicBattlefieldScene(privateScene);
    expect(published.light).toEqual(privateScene.light);
    expect(published.light).not.toBe(privateScene.light);
    expect(published.placements).toHaveLength(1);
    expect(published.layers).toEqual(defaultBattlefieldScene().layers);
    expect(battlefieldCost({ ...privateScene, light: { x: 0, y: 400 } })).toBe(
      battlefieldCost(privateScene),
    );
  });
});
