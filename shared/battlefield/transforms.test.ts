import { describe, expect, test } from 'bun:test';
import { movePlacements, rotatePlacements } from './transforms.ts';
import {
  battlefieldSceneSchema,
  battlefieldDefaultLayerId,
  battlefieldObjectLimit,
  defaultBattlefieldScene,
  type BattlefieldPlacement,
} from '../types/battlefield.ts';
const p = (id: string, x: number, y: number): BattlefieldPlacement => ({
  id,
  itemId: 'ship-tie',
  x,
  y,
  layerId: battlefieldDefaultLayerId,
  visible: true,
  order: 0,
  rotation: 0,
  scale: 1,
  colorId: 'color-default',
});
describe('Battlefield formation transforms', () => {
  test('boundary movement clamps the formation together without changing spacing', () => {
    const result = movePlacements(
      [p('a', 100, 50), p('b', 150, 60), p('c', 400, 100)],
      ['a', 'b'],
      -120,
      -100,
    );
    expect(result.map(v => [v.x, v.y])).toEqual([
      [0, 0],
      [50, 10],
      [400, 100],
    ]);
  });
  test('group rotation changes both ship heading and position around their shared center', () => {
    const result = rotatePlacements([p('a', 500, 100), p('b', 700, 100)], ['a', 'b'], 90);
    expect(result.map(v => [v.x, v.y, v.rotation])).toEqual([
      [600, 0, 90],
      [600, 200, 90],
    ]);
  });
  test('edge rotation preserves spacing and headings, and full turns are normalized', () => {
    const result = rotatePlacements([p('a', 100, 380), p('b', 300, 380)], ['a', 'b'], 90);
    expect(result.map(v => [v.x, v.y])).toEqual([
      [200, 200],
      [200, 400],
    ]);
    expect(rotatePlacements([p('a', 0, 0)], ['a'], -15)[0].rotation).toBe(345);
  });
  test('oversized rotations preserve the original formation rather than distorting it', () => {
    const source = [p('a', 100, 200), p('b', 1500, 200)];
    expect(rotatePlacements(source, ['a', 'b'], 90)).toBe(source);
  });
  test('scene contracts reject impossible transforms and excess objects', () => {
    const placement = p(crypto.randomUUID(), 10, 10);
    expect(
      battlefieldSceneSchema.safeParse({ ...defaultBattlefieldScene(), placements: [placement] })
        .success,
    ).toBe(true);
    for (const invalid of [
      { ...placement, x: -1 },
      { ...placement, scale: 0 },
      { ...placement, rotation: 361 },
      { ...placement, layerId: 'bad' },
      { ...placement, visible: undefined },
      { ...placement, addonIds: ['addon-city'] },
    ])
      expect(
        battlefieldSceneSchema.safeParse({ ...defaultBattlefieldScene(), placements: [invalid] })
          .success,
      ).toBe(false);
    expect(
      battlefieldSceneSchema.safeParse({
        ...defaultBattlefieldScene(),
        placements: Array(battlefieldObjectLimit + 1).fill(placement),
      }).success,
    ).toBe(false);
  });
});
