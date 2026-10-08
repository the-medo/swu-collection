import { publicBattlefieldScene } from '../../../shared/battlefield/layers.ts';
import { normalizeBattlefieldScene } from '../../../shared/battlefield/normalize.ts';
import { battlefieldCopyName, cloneBattlefieldScene } from '../../../shared/battlefield/editing.ts';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { userCredits } from '../../db/schema/patreon.ts';
import { battlefield } from '../../db/schema/battlefield.ts';
import { battlefieldCost, BattlefieldSceneError } from '../../../shared/battlefield/cost.ts';
import { persistUserHeader } from '../user-header/service.ts';
import { cleanupHeaderObject } from '../headers/storage.ts';
import { createUserFileStorage } from '../user-files/storage.ts';
import {
  defaultBattlefieldScene,
  battlefieldSceneSchema,
  type Battlefield,
  type BattlefieldEditorData,
  type BattlefieldSaveInput,
  type BattlefieldDraftInput,
  type BattlefieldScene,
  type PublicBattlefield,
} from '../../../shared/types/battlefield.ts';

export class BattlefieldError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409,
  ) {
    super(message);
  }
}
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const owned = (userId: string, id: string) =>
  and(eq(battlefield.userId, userId), eq(battlefield.id, id));
const columns = {
  id: battlefield.id,
  name: battlefield.name,
  scene: battlefield.scene,
  revision: battlefield.revision,
  active: battlefield.active,
};

// Serialize slot creation, scene revisions and profile activation for each user.
async function lockProfile(tx: Transaction, userId: string) {
  await tx.insert(userProfile).values({ userId }).onConflictDoNothing();
  const [profile] = await tx
    .select({ limit: userProfile.battlefieldLimit })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .for('update');
  return profile;
}
async function balance(database: typeof db | Transaction, userId: string) {
  const [row] = await database
    .select({ balance: sql<number>`coalesce(sum(${userCredits.amount}),0)`.mapWith(Number) })
    .from(userCredits)
    .where(eq(userCredits.userId, userId));
  if (!Number.isSafeInteger(row.balance))
    throw new BattlefieldError('Your credit balance requires review.', 400);
  return row.balance;
}
export function validateBattlefieldScene(
  scene: BattlefieldScene,
  credits: number,
  action: 'save' | 'duplicate' = 'save',
) {
  let cost: number;
  try {
    cost = battlefieldCost(scene);
  } catch (error) {
    if (error instanceof BattlefieldSceneError) throw new BattlefieldError(error.message, 400);
    throw error;
  }
  if (cost > credits)
    throw new BattlefieldError(
      `This Battlefield costs ${cost.toLocaleString()} credits; your budget is ${credits.toLocaleString()}. ${action === 'duplicate' ? 'Edit and save an affordable layout before duplicating it.' : 'Remove objects or customizations before saving.'}`,
      400,
    );
  return cost;
}
export { balance as battlefieldCreditBalance };

export const battlefieldService = {
  async editor(userId: string): Promise<BattlefieldEditorData> {
    const [profile] = await db
      .select({ limit: userProfile.battlefieldLimit })
      .from(userProfile)
      .where(eq(userProfile.userId, userId));
    return {
      battlefields: (
        await db
          .select(columns)
          .from(battlefield)
          .where(eq(battlefield.userId, userId))
          .orderBy(asc(battlefield.createdAt))
      ).map(b => ({
        ...b,
        scene: normalizeBattlefieldScene(b.scene),
      })),
      balance: await balance(db, userId),
      limit: profile?.limit ?? 1,
    };
  },
  async publicProfile(userId: string): Promise<PublicBattlefield | null> {
    const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
    if (!owner) throw new BattlefieldError('User not found.', 404);
    const [active] = await db
      .select({ scene: battlefield.scene })
      .from(battlefield)
      .where(and(eq(battlefield.userId, userId), eq(battlefield.active, true)));
    if (!active) return null;
    return { scene: publicBattlefieldScene(normalizeBattlefieldScene(active.scene)) };
  },
  async create(userId: string, name: string): Promise<Battlefield> {
    return db.transaction(async tx => {
      const profile = await lockProfile(tx, userId);
      const existing = await tx
        .select({ id: battlefield.id })
        .from(battlefield)
        .where(eq(battlefield.userId, userId));
      if (existing.length >= profile.limit)
        throw new BattlefieldError('You have reached your Battlefield limit.', 409);
      const starter = defaultBattlefieldScene(crypto.randomUUID());
      const scene =
        !existing.length && (await balance(tx, userId)) >= battlefieldCost(starter)
          ? starter
          : defaultBattlefieldScene();
      const [created] = await tx
        .insert(battlefield)
        .values({
          userId,
          name,
          scene,
          active: !existing.length,
        })
        .returning(columns);
      return created;
    });
  },
  async duplicate(userId: string, id: string): Promise<Battlefield> {
    return db.transaction(async tx => {
      const profile = await lockProfile(tx, userId);
      const [source] = await tx.select(columns).from(battlefield).where(owned(userId, id));
      if (!source) throw new BattlefieldError('Battlefield not found.', 404);
      const existing = await tx
        .select({ id: battlefield.id })
        .from(battlefield)
        .where(eq(battlefield.userId, userId));
      if (existing.length >= profile.limit)
        throw new BattlefieldError('You have reached your Battlefield limit.', 409);
      const parsed = battlefieldSceneSchema.safeParse(normalizeBattlefieldScene(source.scene));
      if (!parsed.success)
        throw new BattlefieldError('Repair and save this Battlefield before duplicating it.', 400);
      validateBattlefieldScene(parsed.data, await balance(tx, userId), 'duplicate');
      const [copy] = await tx
        .insert(battlefield)
        .values({
          userId,
          name: battlefieldCopyName(source.name),
          scene: cloneBattlefieldScene(parsed.data),
          active: false,
        })
        .returning(columns);
      return copy;
    });
  },
  async createFromDraft(userId: string, input: BattlefieldDraftInput): Promise<Battlefield> {
    return db.transaction(async tx => {
      const profile = await lockProfile(tx, userId);
      const existing = await tx
        .select({ id: battlefield.id })
        .from(battlefield)
        .where(eq(battlefield.userId, userId));
      if (existing.length >= profile.limit)
        throw new BattlefieldError('You have reached your Battlefield limit.', 409);
      validateBattlefieldScene(input.scene, await balance(tx, userId));
      const [created] = await tx
        .insert(battlefield)
        .values({
          userId,
          name: input.name,
          scene: input.scene,
          active: !existing.length,
        })
        .returning(columns);
      return created;
    });
  },
  async save(userId: string, id: string, input: BattlefieldSaveInput): Promise<Battlefield> {
    return db.transaction(async tx => {
      await lockProfile(tx, userId);
      const [current] = await tx.select(columns).from(battlefield).where(owned(userId, id));
      if (!current) throw new BattlefieldError('Battlefield not found.', 404);
      if (current.revision !== input.revision)
        throw new BattlefieldError(
          'This Battlefield changed in another tab. Reload to continue with the latest version.',
          409,
        );
      validateBattlefieldScene(input.scene, await balance(tx, userId));
      const [saved] = await tx
        .update(battlefield)
        .set({
          name: input.name,
          scene: input.scene,
          revision: input.revision + 1,
          updatedAt: new Date(),
        })
        .where(owned(userId, id))
        .returning(columns);
      return saved;
    });
  },
  async activate(userId: string, id: string) {
    const { value, previousHeaderKey } = await db.transaction(async tx => {
      const [owner] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .for('key share');
      if (!owner) throw new BattlefieldError('User not found.', 404);
      await lockProfile(tx, userId);
      const [target] = await tx.select(columns).from(battlefield).where(owned(userId, id));
      if (!target) throw new BattlefieldError('Battlefield not found.', 404);
      const scene = normalizeBattlefieldScene(target.scene);
      validateBattlefieldScene(scene, await balance(tx, userId));
      await tx.update(battlefield).set({ active: false }).where(eq(battlefield.userId, userId));
      await tx.update(battlefield).set({ active: true }).where(owned(userId, id));
      const previousHeaderKey = await persistUserHeader(
        userId,
        { source: 'battlefield' },
        null,
        tx,
      );
      return { value: { ...target, scene, active: true }, previousHeaderKey };
    });
    if (previousHeaderKey)
      await cleanupHeaderObject(createUserFileStorage(), previousHeaderKey, 'Profile header');
    return value;
  },
};
