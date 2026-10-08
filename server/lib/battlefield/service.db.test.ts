import { expect, test } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { userCredits } from '../../db/schema/patreon.ts';
import { battlefield } from '../../db/schema/battlefield.ts';
import { battlefieldService as service } from './service.ts';
import { publicBattlefieldScene } from '../../../shared/battlefield/layers.ts';
import {
  defaultBattlefieldScene,
  type BattlefieldScene,
} from '../../../shared/types/battlefield.ts';

function isolatedDatabase() {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Select the isolated worktree database.');
}
const placement = (itemId = 'ship-tie') => ({
  ...defaultBattlefieldScene(crypto.randomUUID()).placements[0],
  itemId,
  scale: 1,
  textureId: itemId === 'planet' ? ('rocky' as const) : undefined,
});
test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'Battlefield copies are independent, preserve nested contents, and enforce ownership, budget and concurrent slot limits',
  async () => {
    isolatedDatabase();
    const ids = [0, 1].map(() => 'battlefield-duplicate-test-' + crypto.randomUUID());
    try {
      for (const id of ids)
        await db.insert(user).values({
          id,
          name: id,
          displayName: id,
          email: id + '@invalid.local',
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      await db.insert(userCredits).values({
        userId: ids[0],
        amount: 10000,
        source: 'battlefield-test',
        sourceKey: crypto.randomUUID(),
      });
      const created = await service.create(ids[0], 'Fleet');
      await db
        .update(userProfile)
        .set({ battlefieldLimit: 3 })
        .where(eq(userProfile.userId, ids[0]));
      const base = defaultBattlefieldScene(),
        child = crypto.randomUUID(),
        empty = crypto.randomUUID();
      const scene: BattlefieldScene = {
        ...base,
        light: { x: 1500, y: 75 },
        layers: [
          ...base.layers,
          {
            id: child,
            name: 'Hidden escort',
            parentId: base.layers[0].id,
            visible: false,
            order: 1,
          },
          { id: empty, name: 'Empty nested folder', parentId: child, visible: true, order: 2 },
        ],
        placements: [
          { ...placement('planet'), textureId: 'ocean', colorId: 'color-gold', rotation: 45 },
          { ...placement('ship-x-wing'), layerId: child, scale: 0.5, visible: false },
        ],
      };
      const source = await service.save(ids[0], created.id, { name: 'Fleet', scene, revision: 0 });
      await expect(service.duplicate(ids[1], source.id)).rejects.toThrow('not found');
      await expect(service.duplicate(ids[0], crypto.randomUUID())).rejects.toThrow('not found');
      const copy = await service.duplicate(ids[0], source.id);
      expect(copy).toMatchObject({ name: 'Fleet (copy)', revision: 0, active: false });
      expect(copy.id).not.toBe(source.id);
      expect(copy.scene.light).toEqual(source.scene.light);
      expect(copy.scene.layers).toHaveLength(3);
      expect(copy.scene.placements).toHaveLength(2);
      expect(
        copy.scene.layers.map((layer, i) => ({
          ...layer,
          id: scene.layers[i].id,
          parentId: scene.layers[i].parentId,
        })),
      ).toEqual(scene.layers);
      expect(
        copy.scene.placements.map((p, i) => ({
          ...p,
          id: scene.placements[i].id,
          layerId: scene.placements[i].layerId,
        })),
      ).toEqual(scene.placements);
      const sourceIds = new Set([...scene.layers, ...scene.placements].map(record => record.id));
      expect(
        [...copy.scene.layers, ...copy.scene.placements].every(record => !sourceIds.has(record.id)),
      ).toBe(true);
      expect((await service.editor(ids[0])).battlefields.find(row => row.id === source.id)).toEqual(
        source,
      );
      expect((await service.publicProfile(ids[0]))!.scene).toEqual(publicBattlefieldScene(scene));
      await db.update(userCredits).set({ amount: 1000 }).where(eq(userCredits.userId, ids[0]));
      await expect(service.duplicate(ids[0], source.id)).rejects.toThrow('affordable layout');
      expect((await service.editor(ids[0])).battlefields).toHaveLength(2);
      await db.update(userCredits).set({ amount: 10000 }).where(eq(userCredits.userId, ids[0]));
      const concurrent = await Promise.allSettled([
        service.duplicate(ids[0], source.id),
        service.duplicate(ids[0], source.id),
      ]);
      expect(concurrent.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(concurrent.filter(result => result.status === 'rejected')).toHaveLength(1);
      expect((await service.editor(ids[0])).battlefields).toHaveLength(3);
      await expect(service.duplicate(ids[0], source.id)).rejects.toThrow('limit');
      expect((await service.editor(ids[0])).balance).toBe(10000);
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, ids[0])),
      ).toHaveLength(1);
      const changed = { ...copy.scene, light: { x: 100, y: 200 } };
      await service.save(ids[0], copy.id, { name: 'Independent', scene: changed, revision: 0 });
      expect((await service.editor(ids[0])).battlefields.find(row => row.id === source.id)).toEqual(
        source,
      );
    } finally {
      for (const id of ids) await db.delete(user).where(eq(user.id, id));
    }
  },
  20000,
);
test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'Death Star size and capped area cost persist up to 300%, with budget and per-object caps enforced',
  async () => {
    isolatedDatabase();
    const id = 'battlefield-test-' + crypto.randomUUID();
    try {
      await db.insert(user).values({
        id,
        name: id,
        displayName: id,
        email: id + '@invalid.local',
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db.insert(userCredits).values({
        userId: id,
        amount: 400000,
        source: 'battlefield-test',
        sourceKey: crypto.randomUUID(),
      });
      const created = await service.create(id, 'Death Star');
      const scene: BattlefieldScene = {
        ...defaultBattlefieldScene(),
        placements: [{ ...placement('station-death-star'), scale: 3 }],
      };
      const saved = await service.save(id, created.id, { name: 'Death Star', revision: 0, scene });
      expect(saved.scene).toEqual(scene);
      expect((await service.editor(id)).battlefields[0].scene).toEqual(scene);
      expect((await service.publicProfile(id))!.scene).toEqual(publicBattlefieldScene(scene));
      await expect(
        service.save(id, created.id, {
          name: 'Too large',
          revision: 1,
          scene: { ...scene, placements: [{ ...scene.placements[0], scale: 3.05 }] },
        }),
      ).rejects.toThrow('300%');
      await expect(
        service.save(id, created.id, {
          name: 'Over budget',
          revision: 1,
          scene: { ...scene, backgroundId: 'background-midnight' },
        }),
      ).rejects.toThrow('budget');
      await expect(
        service.save(id, created.id, {
          name: 'Ordinary station',
          revision: 1,
          scene: { ...scene, placements: [{ ...placement('station-orbital'), scale: 3.05 }] },
        }),
      ).rejects.toThrow('300%');
      expect((await service.editor(id)).battlefields[0]).toEqual(saved);
      expect((await service.editor(id)).balance).toBe(400000);
      expect(await db.select().from(userCredits).where(eq(userCredits.userId, id))).toHaveLength(1);
      await db.update(userCredits).set({ amount: 199999 }).where(eq(userCredits.userId, id));
      await expect(
        service.save(id, created.id, {
          name: 'Small Death Star',
          revision: 1,
          scene: { ...scene, placements: [{ ...scene.placements[0], scale: 0.2 }] },
        }),
      ).rejects.toThrow((200000).toLocaleString());
    } finally {
      await db.delete(user).where(eq(user.id, id));
    }
  },
  20000,
);
test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'Planet surfaces and reduced ship sizes persist without spending credits',
  async () => {
    isolatedDatabase();
    const id = 'battlefield-test-' + crypto.randomUUID();
    try {
      await db.insert(user).values({
        id,
        name: id,
        displayName: id,
        email: id + '@invalid.local',
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db.insert(userCredits).values({
        userId: id,
        amount: 5000,
        source: 'battlefield-test',
        sourceKey: crypto.randomUUID(),
      });
      const created = await service.create(id, 'Surfaces');
      const scene: BattlefieldScene = {
        ...defaultBattlefieldScene(),
        placements: [
          { ...placement('planet'), textureId: 'ocean', colorId: 'color-gold', scale: 0.8 },
          { ...placement('ship-x-wing'), scale: 0.5 },
        ],
      };
      const saved = await service.save(id, created.id, { name: 'Surfaces', revision: 0, scene });
      expect(saved.scene).toEqual(scene);
      expect((await service.editor(id)).battlefields[0].scene).toEqual(scene);
      expect((await service.publicProfile(id))!.scene).toEqual(publicBattlefieldScene(scene));
      await expect(
        service.save(id, created.id, {
          name: 'Too large',
          revision: 1,
          scene: {
            ...scene,
            placements: scene.placements.map(p =>
              p.itemId === 'ship-x-wing' ? { ...p, scale: 1.05 } : p,
            ),
          },
        }),
      ).rejects.toThrow('20–100%');
      const gas: BattlefieldScene = {
        ...scene,
        placements: scene.placements.map(p =>
          p.itemId === 'planet' ? { ...p, textureId: 'gas' as const } : p,
        ),
      };
      await service.save(id, created.id, { name: 'Gas', revision: 1, scene: gas });
      expect((await service.publicProfile(id))!.scene).toEqual(publicBattlefieldScene(gas));
      expect((await service.editor(id)).balance).toBe(5000);
      expect(await db.select().from(userCredits).where(eq(userCredits.userId, id))).toHaveLength(1);
    } finally {
      await db.delete(user).where(eq(user.id, id));
    }
  },
  20000,
);
test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'Main light persists independently of budget and old JSONB layouts normalize without writes',
  async () => {
    isolatedDatabase();
    const id = 'battlefield-test-' + crypto.randomUUID();
    try {
      await db.insert(user).values({
        id,
        name: id,
        displayName: id,
        email: id + '@invalid.local',
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const created = await service.create(id, 'Lighting');
      const { light: _light, ...oldScene } = created.scene;
      await db
        .update(battlefield)
        .set({ scene: oldScene as BattlefieldScene })
        .where(eq(battlefield.id, created.id));
      expect((await service.editor(id)).battlefields[0].scene).toEqual(created.scene);
      expect(await service.publicProfile(id)).toEqual({ scene: created.scene });
      expect((await service.activate(id, created.id)).scene).toEqual(created.scene);
      const [untouched] = await db.select().from(battlefield).where(eq(battlefield.id, created.id));
      expect(untouched.scene).toEqual(oldScene);
      expect(untouched.revision).toBe(0);
      const moved = { ...created.scene, light: { x: 1480, y: 360 } };
      const saved = await service.save(id, created.id, {
        name: 'Lighting',
        revision: 0,
        scene: moved,
      });
      expect(saved.scene).toEqual(moved);
      expect(saved.revision).toBe(1);
      expect((await service.editor(id)).battlefields[0].scene).toEqual(moved);
      expect(await service.publicProfile(id)).toEqual({ scene: moved });
      expect((await service.editor(id)).balance).toBe(0);
      expect(await db.select().from(userCredits).where(eq(userCredits.userId, id))).toHaveLength(0);
    } finally {
      await db.delete(user).where(eq(user.id, id));
    }
  },
  20000,
);
test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'Independent full budgets, concurrent slots/revisions, ownership, validation, activation and cascades',
  async () => {
    isolatedDatabase();
    const ids = [0, 1].map(() => 'battlefield-test-' + crypto.randomUUID());
    try {
      for (const id of ids)
        await db.insert(user).values({
          id,
          name: id,
          displayName: id,
          email: id + '@invalid.local',
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      expect(await service.editor(ids[0])).toEqual({ battlefields: [], balance: 0, limit: 1 });
      expect(await service.publicProfile(ids[0])).toBeNull();
      const creates = await Promise.allSettled(
        Array.from({ length: 5 }, () => service.create(ids[0], 'My Battlefield')),
      );
      expect(creates.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      const original = (await service.editor(ids[0])).battlefields[0];
      expect(original.active).toBe(true);
      expect(original.scene.placements).toHaveLength(0);
      const scene = {
        ...defaultBattlefieldScene(),
        placements: Array.from({ length: 20 }, () => placement()),
      };
      const save = (candidate = scene, revision = 0) =>
        service.save(ids[0], original.id, { name: 'Imperial fleet', scene: candidate, revision });
      await expect(save()).rejects.toThrow('your budget is 0');
      await expect(
        service.save(ids[1], original.id, { name: 'Stolen', scene, revision: 0 }),
      ).rejects.toThrow('not found');
      await expect(service.activate(ids[1], original.id)).rejects.toThrow('not found');
      await db.insert(userCredits).values({
        userId: ids[0],
        amount: 5000,
        source: 'battlefield-test',
        sourceKey: crypto.randomUUID(),
      });
      await expect(
        save({ ...scene, placements: [...scene.placements, placement()] }),
      ).rejects.toThrow('costs 5,250');
      expect((await service.editor(ids[0])).battlefields[0].revision).toBe(0);
      await expect(save({ ...scene, placements: [{ ...placement(), scale: 2 }] })).rejects.toThrow(
        '20–100%',
      );
      await expect(
        save({ ...scene, placements: [{ ...placement('planet'), scale: 3 }] }),
      ).rejects.toThrow('costs 9,000');
      await expect(
        save({ ...scene, placements: [scene.placements[0], scene.placements[0]] }),
      ).rejects.toThrow('unique placement');
      await expect(save({ ...scene, backgroundId: 'unknown' })).rejects.toThrow('valid background');
      await expect(
        save({ ...scene, placements: [{ ...placement(), layerId: crypto.randomUUID() }] }),
      ).rejects.toThrow('existing layer');
      const saves = await Promise.allSettled([save(), save()]);
      expect(saves.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(saves.filter(r => r.status === 'rejected')).toHaveLength(1);
      expect(await service.publicProfile(ids[0])).toEqual({ scene: publicBattlefieldScene(scene) });
      // Existing scaled ships display and activate at the fixed model size.
      await db
        .update(battlefield)
        .set({
          scene: {
            ...scene,
            placements: scene.placements.map((p, i) => (i ? p : { ...p, scale: 2 })),
          },
        })
        .where(eq(battlefield.id, original.id));
      expect((await service.editor(ids[0])).battlefields[0].scene).toEqual(scene);
      expect(await service.publicProfile(ids[0])).toEqual({ scene: publicBattlefieldScene(scene) });
      expect((await service.activate(ids[0], original.id)).scene).toEqual(scene);
      await expect(service.create(ids[0], 'Second')).rejects.toThrow('limit');
      await db
        .update(userProfile)
        .set({ battlefieldLimit: 2 })
        .where(eq(userProfile.userId, ids[0]));
      const second = await service.create(ids[0], 'Rebel fleet');
      expect(second.active).toBe(false);
      const rebel = {
        ...scene,
        placements: Array.from({ length: 20 }, () => ({ ...placement(), scale: 0.5 })),
      };
      // Both layouts independently use ALL 5,000 credits. Saving/activating
      // never reserves or spends any part of the shared credit balance.
      await service.save(ids[0], second.id, { name: second.name, scene: rebel, revision: 0 });
      await Promise.all([
        service.activate(ids[0], original.id),
        service.activate(ids[0], second.id),
      ]);
      expect((await service.editor(ids[0])).battlefields.filter(b => b.active)).toHaveLength(1);
      expect((await service.editor(ids[0])).balance).toBe(5000);
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, ids[0])),
      ).toHaveLength(1);
      // Even direct API activation rechecks the current authoritative budget.
      await db.insert(userCredits).values({
        userId: ids[0],
        amount: -1,
        source: 'battlefield-test',
        sourceKey: crypto.randomUUID(),
      });
      await expect(service.activate(ids[0], original.id)).rejects.toThrow('your budget is 4,999');
      await expect(save(scene, 1)).rejects.toThrow('your budget is 4,999');
      const sanitizer = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
      const cleanup = sanitizer.match(/TRUNCATE TABLE battlefield;/)![0];
      const assertion = sanitizer.match(
        /IF EXISTS \(SELECT 1 FROM battlefield\)[\s\S]*?END IF;/,
      )![0];
      const check = (clean: boolean) =>
        db.transaction(async tx => {
          await tx.execute(
            sql.raw('CREATE TEMP TABLE battlefield (private_data text) ON COMMIT DROP'),
          );
          await tx.execute(sql.raw("INSERT INTO battlefield VALUES ('private fixture')"));
          if (clean) await tx.execute(sql.raw(cleanup));
          await tx.execute(sql.raw('DO $$ BEGIN ' + assertion + ' END $$;'));
        });
      await expect(check(false)).rejects.toThrow('Battlefield layouts remain');
      await check(true);
    } finally {
      for (const id of ids) await db.delete(user).where(eq(user.id, id));
    }
    for (const id of ids) {
      expect(await db.select().from(battlefield).where(eq(battlefield.userId, id))).toHaveLength(0);
      expect(await db.select().from(userCredits).where(eq(userCredits.userId, id))).toHaveLength(0);
    }
  },
  20000,
);

test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'Starter planet is included only when its area-adjusted cost fits the budget',
  async () => {
    isolatedDatabase();
    const ids: string[] = [];
    try {
      for (const amount of [1000, 3609, 3610]) {
        const id = 'battlefield-test-' + crypto.randomUUID();
        ids.push(id);
        await db.insert(user).values({
          id,
          name: id,
          displayName: id,
          email: id + '@invalid.local',
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await db.insert(userCredits).values({
          userId: id,
          amount,
          source: 'battlefield-test',
          sourceKey: crypto.randomUUID(),
        });
        const created = await service.create(id, 'Starter');
        expect(created.scene.placements).toHaveLength(amount >= 3610 ? 1 : 0);
      }
    } finally {
      for (const id of ids) await db.delete(user).where(eq(user.id, id));
    }
  },
  20000,
);

test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'Shop migration preserves ordered placements and refunds once; unresolved copies fail safely',
  async () => {
    isolatedDatabase();
    const migration = (
      await Bun.file('server/lib/battlefield/fixtures/shop-to-budget.sql').text()
    ).split('--> statement-breakpoint');
    const run = (broken: boolean) =>
      db.transaction(async tx => {
        await tx.execute(
          sql.raw(
            'CREATE TEMP TABLE battlefield (id uuid, user_id text, scene jsonb) ON COMMIT DROP',
          ),
        );
        await tx.execute(
          sql.raw(
            'CREATE TEMP TABLE battlefield_inventory (id uuid, user_id text, item_id text) ON COMMIT DROP',
          ),
        );
        await tx.execute(
          sql.raw(
            'CREATE TEMP TABLE user_credits (id uuid DEFAULT gen_random_uuid(), user_id text, amount bigint, source text, source_key text UNIQUE) ON COMMIT DROP',
          ),
        );
        const first = placement(),
          second = placement('planet');
        const oldPlacement = (p: typeof first) => {
          const { id, itemId: _itemId, ...rest } = p;
          return { ...rest, inventoryId: id };
        };
        const scene = {
          ...defaultBattlefieldScene(),
          placements: [oldPlacement(first), oldPlacement(second)],
        };
        await tx.execute(
          sql`INSERT INTO battlefield VALUES (${crypto.randomUUID()}, 'fixture', ${JSON.stringify(scene)}::jsonb)`,
        );
        await tx.execute(
          sql`INSERT INTO battlefield_inventory VALUES (${first.id}, 'fixture', ${first.itemId}), (${second.id}, ${broken ? 'foreign' : 'fixture'}, ${second.itemId})`,
        );
        await tx.execute(
          sql`INSERT INTO user_credits (user_id, amount, source, source_key) VALUES ('fixture', 10000, 'award', 'award'), ('fixture', -250, 'battlefield-purchase', 'purchase'), ('fixture', -200, 'other', 'other')`,
        );
        for (let repeat = 0; repeat < 2; repeat++)
          for (const statement of migration) await tx.execute(sql.raw(statement));
        const scenes = await tx.execute(sql`SELECT scene FROM battlefield`);
        expect(scenes[0].scene).toEqual({
          ...defaultBattlefieldScene(),
          placements: [first, second],
        });
        const credits = await tx.execute(
          sql`SELECT source, amount::integer FROM user_credits ORDER BY source`,
        );
        expect(credits).toHaveLength(4);
        expect(credits.find(r => r.source === 'battlefield-refund')?.amount).toBe(250);
        expect(credits.find(r => r.source === 'other')?.amount).toBe(-200);
      });
    await run(false);
    await expect(run(true)).rejects.toThrow('unresolved inventory copy');
  },
  20000,
);

test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'Layers, hidden objects and per-copy add-ons persist; old groups/add-ons convert on read and save',
  async () => {
    isolatedDatabase();
    const userId = 'battlefield-test-' + crypto.randomUUID();
    try {
      await db.insert(user).values({
        id: userId,
        name: userId,
        displayName: userId,
        email: userId + '@invalid.local',
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db.insert(userCredits).values({
        userId,
        amount: 10000,
        source: 'battlefield-test',
        sourceKey: crypto.randomUUID(),
      });
      const original = await service.create(userId, 'Layers');
      const layerId = crypto.randomUUID();
      const scene = {
        ...defaultBattlefieldScene(),
        layers: [
          ...defaultBattlefieldScene().layers,
          { id: layerId, name: 'Surface', visible: false, parentId: null, order: 1 },
        ],
        placements: [
          placement('planet'),
          placement('addon-city'),
          placement('addon-city'),
          placement('addon-ion'),
        ].map(p => ({ ...p, layerId, visible: p.itemId !== 'planet' })),
      };
      const saved = await service.save(userId, original.id, {
        name: original.name,
        scene,
        revision: 0,
      });
      expect(saved.scene).toEqual(scene);
      expect((await service.editor(userId)).battlefields[0].scene).toEqual(scene);
      expect(await service.publicProfile(userId)).toEqual({ scene: publicBattlefieldScene(scene) });
      await expect(
        service.save(userId, original.id, {
          name: original.name,
          revision: 1,
          scene: {
            ...scene,
            placements: Array.from({ length: 10 }, () => ({
              ...placement('addon-city'),
              visible: false,
            })),
          },
        }),
      ).rejects.toThrow('costs 12,000');
      const parent = {
        id: crypto.randomUUID(),
        itemId: 'planet',
        x: 500,
        y: 200,
        rotation: 30,
        scale: 1,
        colorId: 'color-default',
        groupId: layerId,
        addonIds: ['addon-city', 'addon-ion'],
      };
      const legacy = {
        width: 1600,
        height: 400,
        backgroundId: 'background-default',
        placements: [parent, { ...parent, id: crypto.randomUUID(), x: 900 }],
      };
      await db.execute(
        sql`UPDATE battlefield SET scene=${JSON.stringify(legacy)}::jsonb WHERE id=${original.id}`,
      );
      const converted = (await service.editor(userId)).battlefields[0].scene;
      expect(converted.placements).toHaveLength(6);
      expect(converted.layers).toHaveLength(2);
      expect(await service.publicProfile(userId)).toEqual({
        scene: publicBattlefieldScene(converted),
      });
      expect((await service.activate(userId, original.id)).scene).toEqual(converted);
      await service.save(userId, original.id, {
        name: original.name,
        scene: converted,
        revision: 1,
      });
      const [stored] = await db
        .select({ scene: battlefield.scene })
        .from(battlefield)
        .where(eq(battlefield.id, original.id));
      expect(stored.scene).toEqual(converted);
      expect((await service.editor(userId)).balance).toBe(10000);
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, userId)),
      ).toHaveLength(1);
    } finally {
      await db.delete(user).where(eq(user.id, userId));
    }
  },
  20000,
);

test.skipIf(process.env.BATTLEFIELD_DB_TEST !== '1')(
  'Nested layer trees persist, protect private contents, reject cycles and upgrade flat layouts',
  async () => {
    isolatedDatabase();
    const userId = 'battlefield-test-' + crypto.randomUUID();
    try {
      await db.insert(user).values({
        id: userId,
        name: userId,
        displayName: userId,
        email: userId + '@invalid.local',
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db.insert(userCredits).values({
        userId,
        amount: 5000,
        source: 'battlefield-test',
        sourceKey: crypto.randomUUID(),
      });
      const original = await service.create(userId, 'Nested fleet');
      const base = defaultBattlefieldScene(),
        root = base.layers[0].id;
      const fleet = crypto.randomUUID(),
        wing = crypto.randomUUID();
      const scene = {
        ...base,
        layers: [
          ...base.layers,
          { id: fleet, name: 'Private fleet', visible: true, parentId: root, order: 1 },
          { id: wing, name: 'Private wing', visible: true, parentId: fleet, order: 0 },
        ],
        placements: [
          { ...placement(), layerId: root, order: 0 },
          { ...placement(), layerId: fleet, order: 1 },
          { ...placement(), layerId: wing, order: 0 },
          { ...placement(), layerId: wing, order: 1, visible: false },
        ],
      };
      await service.save(userId, original.id, { name: original.name, scene, revision: 0 });
      expect((await service.editor(userId)).battlefields[0].scene).toEqual(scene);
      const publicScene = (await service.publicProfile(userId))!.scene;
      expect(publicScene).toEqual(publicBattlefieldScene(scene));
      expect(publicScene.placements.map(p => p.id)).toEqual([
        scene.placements[0].id,
        scene.placements[2].id,
        scene.placements[1].id,
      ]);
      expect(JSON.stringify(publicScene)).not.toContain('Private');
      const hidden = {
        ...scene,
        layers: scene.layers.map(layer =>
          layer.id === fleet ? { ...layer, visible: false } : layer,
        ),
      };
      await service.save(userId, original.id, { name: original.name, scene: hidden, revision: 1 });
      expect((await service.publicProfile(userId))!.scene.placements.map(p => p.id)).toEqual([
        scene.placements[0].id,
      ]);
      expect((await service.editor(userId)).battlefields[0].scene.placements).toEqual(
        scene.placements,
      );
      for (const parentId of [wing, root, crypto.randomUUID()]) {
        try {
          await service.save(userId, original.id, {
            name: original.name,
            revision: 2,
            scene: {
              ...scene,
              layers: scene.layers.map(layer =>
                layer.id === root ? { ...layer, parentId } : layer,
              ),
            },
          });
          throw new Error('Invalid tree was accepted');
        } catch (error) {
          expect(error).toMatchObject({ status: 400 });
        }
      }
      expect((await service.editor(userId)).battlefields[0].revision).toBe(2);
      const flat = {
        ...scene,
        layers: scene.layers.map(({ parentId: _parentId, order: _order, ...layer }) => layer),
        placements: scene.placements.map(({ order: _order, ...p }) => p),
      };
      await db.execute(
        sql`UPDATE battlefield SET scene=${JSON.stringify(flat)}::jsonb WHERE id=${original.id}`,
      );
      const upgraded = (await service.editor(userId)).battlefields[0].scene;
      expect(upgraded.layers.every(layer => layer.parentId === null)).toBe(true);
      expect(upgraded.layers.map(layer => layer.order)).toEqual([0, 1, 2]);
      expect(upgraded.placements.map(p => p.order)).toEqual([0, 0, 0, 1]);
      expect((await service.publicProfile(userId))!.scene).toEqual(
        publicBattlefieldScene(upgraded),
      );
      await service.save(userId, original.id, {
        name: original.name,
        revision: 2,
        scene: upgraded,
      });
      const [stored] = await db
        .select({ scene: battlefield.scene })
        .from(battlefield)
        .where(eq(battlefield.id, original.id));
      expect(stored.scene).toEqual(upgraded);
      expect((await service.editor(userId)).balance).toBe(5000);
      expect(
        await db.select().from(userCredits).where(eq(userCredits.userId, userId)),
      ).toHaveLength(1);
    } finally {
      await db.delete(user).where(eq(user.id, userId));
    }
  },
  20000,
);
