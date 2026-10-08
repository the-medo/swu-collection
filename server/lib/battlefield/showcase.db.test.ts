import { expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userCredits } from '../../db/schema/patreon.ts';
import { battlefieldPreset } from '../../db/schema/battlefield_preset.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { battlefieldService } from './service.ts';
import { battlefieldPresetService as service } from './presets.ts';
import { battlefieldCost } from '../../../shared/battlefield/cost.ts';
import { cloneBattlefieldScene } from '../../../shared/battlefield/editing.ts';
import {
  defaultBattlefieldScene,
  battlefieldShowcaseDefaultFilters,
  type BattlefieldScene,
  type BattlefieldFaction,
} from '../../../shared/types/battlefield.ts';

const scene = (itemId?: string, scale = 1, hidden = false): BattlefieldScene => {
  const value = defaultBattlefieldScene();
  if (itemId)
    value.placements.push({
      ...defaultBattlefieldScene(crypto.randomUUID()).placements[0],
      x: 800,
      y: 200,
      scale,
      itemId,
      visible: !hidden,
      textureId: itemId === 'planet' ? 'rocky' : undefined,
    });
  return value;
};
test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'showcase searches, filters and sorts the complete set with current costs; versioned edits preserve independent personal copies',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select the isolated worktree database.');
    const userId = 'battlefield-showcase-db-' + crypto.randomUUID(),
      prefix = 'Showcase ' + crypto.randomUUID();
    const ids: string[] = [];
    try {
      await db.insert(user).values({
        id: userId,
        name: prefix,
        displayName: userId,
        email: userId + '@invalid.local',
        emailVerified: false,
        currency: 'USD',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db
        .insert(userCredits)
        .values({ userId, amount: 1000, source: 'showcase-test', sourceKey: crypto.randomUUID() });
      const definitions: [string, BattlefieldScene, BattlefieldFaction[]][] = [
        ['free', scene(), ['rebel']],
        ['fighter', scene('ship-x-wing', 1, true), ['rebel', 'imperial']],
        ['planet', scene('planet', 1), ['republic']],
        ['scaled planet', scene('planet', 1.5), ['republic']],
        ['Death Star', scene('station-death-star', 2), ['imperial']],
        ['literal %_', scene(), []],
      ];
      const rows = [];
      for (const [name, layout, factions] of definitions) {
        const row = await service.create({ name: prefix + ' ' + name, scene: layout, factions });
        ids.push(row.id);
        rows.push(row);
      }
      const filters = { ...battlefieldShowcaseDefaultFilters, search: prefix };
      const newest = await service.list(1, filters);
      expect(newest.total).toBe(6);
      expect(newest.presets.map(p => p.id)).toEqual(ids.slice(3).reverse());
      expect((await service.list(2, filters)).presets.map(p => p.id)).toEqual(
        ids.slice(0, 3).reverse(),
      );
      expect((await service.list(1, { ...filters, search: prefix.toUpperCase() })).total).toBe(6);
      expect(
        (await service.list(1, { ...filters, search: prefix + ' literal %_' })).presets.map(
          p => p.id,
        ),
      ).toEqual([ids[5]]);
      expect((await service.list(1, { ...filters, search: prefix + ' literal %X' })).total).toBe(0);
      expect(
        (await service.list(1, { ...filters, faction: 'rebel' })).presets.map(p => p.id),
      ).toEqual([ids[1], ids[0]]);
      const affordable = await service.list(1, { ...filters, withinCredits: true }, userId);
      const eligible = rows
        .filter(row => battlefieldCost(row.scene) <= 1000)
        .map(row => row.id)
        .reverse();
      expect(affordable.total).toBe(eligible.length);
      expect(affordable.presets.map(p => p.id)).toEqual(eligible.slice(0, 3));
      expect(
        (await service.list(2, { ...filters, withinCredits: true }, userId)).presets.map(p => p.id),
      ).toEqual(eligible.slice(3));
      const sorted = rows
        .slice()
        .reverse()
        .sort((a, b) => a.cost - b.cost);
      const asc = [
        ...(await service.list(1, { ...filters, sort: 'price-asc' })).presets,
        ...(await service.list(2, { ...filters, sort: 'price-asc' })).presets,
      ];
      expect(asc.map(p => p.id)).toEqual(sorted.map(p => p.id));
      const descending = rows
        .slice()
        .reverse()
        .sort((a, b) => b.cost - a.cost);
      expect(
        (await service.list(1, { ...filters, sort: 'price-desc' })).presets.map(p => p.id),
      ).toEqual(descending.slice(0, 3).map(p => p.id));
      expect(
        (
          await service.list(
            1,
            { ...filters, sort: 'price-asc', faction: 'imperial', withinCredits: true },
            userId,
          )
        ).presets.map(p => p.id),
      ).toEqual([ids[1]]);
      await expect(service.list(1, { ...filters, withinCredits: true })).rejects.toMatchObject({
        status: 400,
      });
      const source = rows[1];
      const copy = await battlefieldService.createFromDraft(userId, {
        name: source.name,
        scene: cloneBattlefieldScene(source.scene),
      });
      await db
        .update(userProfile)
        .set({ headerSource: 'upload', headerWidth: 1600, headerHeight: 400 })
        .where(eq(userProfile.userId, userId));
      await expect(battlefieldService.activate(userId, crypto.randomUUID())).rejects.toMatchObject({
        status: 404,
      });
      expect(
        (await db.select().from(userProfile).where(eq(userProfile.userId, userId)))[0].headerSource,
      ).toBe('upload');
      await battlefieldService.activate(userId, copy.id);
      expect(
        (await db.select().from(userProfile).where(eq(userProfile.userId, userId)))[0],
      ).toMatchObject({
        headerSource: 'battlefield',
        headerImageKey: null,
        headerWidth: null,
        headerHeight: null,
      });
      const edited = await service.save(source.id, {
        name: prefix + ' revised',
        scene: scene('station-death-star', 3),
        factions: ['separatist'],
        revision: 0,
      });
      expect(edited.revision).toBe(1);
      expect(edited.cost).toBe(400000);
      expect((await battlefieldService.editor(userId)).battlefields[0]).toEqual(copy);
      expect((await battlefieldService.editor(userId)).balance).toBe(1000);
      const competing = await Promise.allSettled(
        ['rebel', 'imperial'].map(faction =>
          service.save(source.id, {
            name: edited.name,
            scene: edited.scene,
            factions: [faction as BattlefieldFaction],
            revision: 1,
          }),
        ),
      );
      expect(competing.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      for (const result of competing)
        if (result.status === 'rejected') expect(result.reason).toMatchObject({ status: 409 });
      expect((await service.get(source.id)).revision).toBe(2);
      expect((await battlefieldService.editor(userId)).battlefields[0]).toEqual(copy);
      await expect(
        service.save(crypto.randomUUID(), {
          name: 'Missing',
          scene: scene(),
          factions: [],
          revision: 0,
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        service.save(source.id, {
          name: 'Bad graph',
          scene: {
            ...scene(),
            placements: [{ ...scene('ship-x-wing').placements[0], layerId: crypto.randomUUID() }],
          },
          factions: [],
          revision: 2,
        }),
      ).rejects.toMatchObject({ status: 400 });
      const stale = await service.create({
        name: prefix + ' stale catalog',
        scene: scene('ship-x-wing'),
        factions: [],
      });
      ids.push(stale.id);
      const stored = {
        ...stale.scene,
        backgroundId: 'retired-background',
        placements: [
          {
            ...stale.scene.placements[0],
            scale: 2,
            colorId: 'retired-color',
            textureId: 'retired-surface',
          },
          { ...stale.scene.placements[0], id: crypto.randomUUID(), itemId: 'retired-ship' },
        ],
      };
      await db
        .update(battlefieldPreset)
        .set({ scene: stored })
        .where(eq(battlefieldPreset.id, stale.id));
      const repaired = await service.get(stale.id);
      expect(repaired.cost).toBe(400);
      expect(repaired.scene.placements).toHaveLength(1);
      expect(repaired.scene.placements[0]).toMatchObject({ itemId: 'ship-x-wing', scale: 1 });
      const matching = {
        ...filters,
        search: stale.name,
        withinCredits: true,
        sort: 'price-desc' as const,
      };
      expect((await service.list(1, matching, userId)).presets).toEqual([repaired]);
      expect(
        (await db.select().from(battlefieldPreset).where(eq(battlefieldPreset.id, stale.id)))[0],
      ).toMatchObject({ scene: stored, revision: 0 });
      const surface = await service.create({
        name: prefix + ' retired planet surface',
        scene: scene('planet'),
        factions: [],
      });
      ids.push(surface.id);
      const oldSurface = {
        ...surface.scene,
        placements: surface.scene.placements.map(p => ({ ...p, textureId: 'retired-surface' })),
      };
      await db
        .update(battlefieldPreset)
        .set({ scene: oldSurface })
        .where(eq(battlefieldPreset.id, surface.id));
      const available = await service.get(surface.id);
      expect(available.cost).toBe(1000);
      expect(available.scene.placements).toHaveLength(1);
      expect(available.scene.placements[0].textureId).not.toBe('retired-surface');
      expect(
        (await service.list(1, { ...matching, search: surface.name }, userId)).presets,
      ).toEqual([available]);
      expect(
        (await db.select().from(battlefieldPreset).where(eq(battlefieldPreset.id, surface.id)))[0],
      ).toMatchObject({ scene: oldSurface, revision: 0 });
    } finally {
      if (ids.length) await db.delete(battlefieldPreset).where(inArray(battlefieldPreset.id, ids));
      await db.delete(user).where(eq(user.id, userId));
    }
  },
);
