import { expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { userCredits } from '../../db/schema/patreon.ts';
import { battlefieldPreset } from '../../db/schema/battlefield_preset.ts';
import { battlefieldService } from './service.ts';
import { battlefieldPresetService } from './presets.ts';
import { cloneBattlefieldScene } from '../../../shared/battlefield/editing.ts';
import { defaultBattlefieldScene } from '../../../shared/types/battlefield.ts';

test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'public presets remain independent of personal slots; draft saves enforce budgets, ownership, revisions and concurrent limits',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select the isolated worktree database.');
    const users = [0, 1].map(() => 'battlefield-presets-db-' + crypto.randomUUID());
    const presets: string[] = [];
    try {
      for (const id of users) {
        await db.insert(user).values({
          id,
          name: id,
          displayName: id,
          email: id + '@invalid.local',
          emailVerified: false,
          currency: 'USD',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await db.insert(userProfile).values({ userId: id, battlefieldLimit: 2 });
        await db.insert(userCredits).values({
          userId: id,
          amount: 1000,
          source: 'battlefield-presets-test',
          sourceKey: crypto.randomUUID(),
        });
      }
      const scene = defaultBattlefieldScene();
      const root = scene.layers[0].id,
        child = crypto.randomUUID();
      scene.layers.push({
        id: child,
        parentId: root,
        name: 'Hidden wing',
        visible: false,
        order: 0,
      });
      scene.placements.push({
        ...defaultBattlefieldScene(crypto.randomUUID()).placements[0],
        itemId: 'ship-x-wing',
        x: 800,
        y: 200,
        scale: 1,
        layerId: child,
        visible: false,
        textureId: undefined,
      });
      const baseline = await battlefieldPresetService.list(1);
      for (let i = 0; i < 4; i++)
        presets.push((await battlefieldPresetService.create({ name: 'Fixture ' + i, scene })).id);
      const first = await battlefieldPresetService.list(1),
        second = await battlefieldPresetService.list(2);
      expect(first.total).toBe(baseline.total + 4);
      expect(first.presets).toHaveLength(3);
      expect(first.presets.map(p => p.id)).toEqual(presets.slice(1).reverse());
      expect(second.presets[0].id).toBe(presets[0]);
      expect((await battlefieldService.editor(users[0])).battlefields).toHaveLength(0);
      const preset = await battlefieldPresetService.get(presets[0]);
      expect(preset.cost).toBe(400); // Hidden contents still count.
      expect(preset.scene.layers[1].visible).toBe(false);
      expect(preset.scene.layers[1].parentId).toBe(preset.scene.layers[0].id);
      expect(preset.scene.layers[0].id).not.toBe(root);
      await expect(battlefieldPresetService.get(crypto.randomUUID())).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        battlefieldPresetService.create({
          name: 'Invalid graph',
          scene: { ...scene, layers: [{ ...scene.layers[0], parentId: child }, scene.layers[1]] },
        }),
      ).rejects.toMatchObject({ status: 400 });
      const deathStar = cloneBattlefieldScene(scene);
      deathStar.placements[0] = {
        ...deathStar.placements[0],
        itemId: 'station-death-star',
        scale: 3,
      };
      const costly = await battlefieldPresetService.create({
        name: 'Unaffordable fixture',
        scene: deathStar,
      });
      presets.push(costly.id);
      expect(costly.cost).toBe(400000);
      await expect(
        battlefieldService.createFromDraft(users[0], {
          name: costly.name,
          scene: cloneBattlefieldScene(costly.scene),
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect((await battlefieldService.editor(users[0])).battlefields).toHaveLength(0);
      const saved = await battlefieldService.createFromDraft(users[0], {
        name: preset.name,
        scene: cloneBattlefieldScene(preset.scene),
      });
      expect(saved.active).toBe(true);
      expect(saved.scene.placements).toHaveLength(1);
      expect(saved.scene.placements[0].visible).toBe(false);
      await expect(
        battlefieldService.save(users[1], saved.id, {
          name: 'Intrusion',
          scene: scene,
          revision: 0,
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        battlefieldService.save(users[0], saved.id, {
          name: costly.name,
          scene: costly.scene,
          revision: 0,
        }),
      ).rejects.toMatchObject({ status: 400 });
      const remix = await battlefieldService.save(users[0], saved.id, {
        name: 'Remix',
        scene: defaultBattlefieldScene(),
        revision: 0,
      });
      expect(remix.active).toBe(true);
      await expect(
        battlefieldService.save(users[0], saved.id, { name: 'Stale', scene, revision: 0 }),
      ).rejects.toMatchObject({ status: 409 });
      expect(await battlefieldPresetService.get(preset.id)).toEqual(preset);
      const attempts = await Promise.allSettled(
        [0, 1, 2].map(() =>
          battlefieldService.createFromDraft(users[0], {
            name: 'Additional',
            scene: cloneBattlefieldScene(preset.scene),
          }),
        ),
      );
      expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      for (const result of attempts)
        if (result.status === 'rejected') expect(result.reason).toMatchObject({ status: 409 });
      const editor = await battlefieldService.editor(users[0]);
      expect(editor.balance).toBe(1000);
      expect(editor.battlefields).toHaveLength(2);
      expect(editor.battlefields.filter(b => b.active)).toHaveLength(1);
      expect(editor.battlefields.find(b => b.id === saved.id)).toEqual(remix);
      expect(await battlefieldPresetService.remove(preset.id)).toEqual({ id: preset.id });
      await expect(battlefieldPresetService.get(preset.id)).rejects.toMatchObject({ status: 404 });
      await expect(battlefieldPresetService.remove(preset.id)).rejects.toMatchObject({
        status: 404,
      });
      expect((await battlefieldService.editor(users[0])).battlefields).toEqual(editor.battlefields);
    } finally {
      if (presets.length)
        await db.delete(battlefieldPreset).where(inArray(battlefieldPreset.id, presets));
      for (const id of users) await db.delete(user).where(eq(user.id, id));
    }
  },
);
