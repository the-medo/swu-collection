import { createHash } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { user } from '../../db/schema/auth-schema.ts';
import { creation, creatorProfile, creatorPublishingRequest } from '../../db/schema/creator_hub.ts';
import type {
  CreatorOnboarding,
  CreatorOnboardingResult,
} from '../../../shared/creators/contracts.ts';
import type { Database, Transaction } from './types.ts';
import { CreatorError } from './errors.ts';
import { requireCreator } from './permissions.ts';
import { assertCreatorProfileAllowed } from './moderation.ts';

// Personal saves and transfers share this lock, so a transfer has a definite cutoff.
export async function lockPersonalOwner(tx: Transaction, userId: string) {
  const [owner] = await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    // Compatible with foreign-key KEY SHARE locks from creator-owned article inserts.
    .for('no key update');
  if (!owner) throw new CreatorError('Sign in to continue.', 401);
}

export const personalArticles = (userId: string) =>
  and(eq(creation.ownerUserId, userId), isNull(creation.creatorId));

export function createOwnershipService(database: Database, lockOwner = lockPersonalOwner) {
  async function transfer(
    viewerId: string,
    requestId: string,
    target: { creatorId: string } | { onboarding: CreatorOnboarding },
  ): Promise<CreatorOnboardingResult> {
    const inputHash = createHash('sha256').update(JSON.stringify(target)).digest('hex');
    try {
      return await database.transaction(async tx => {
        await lockOwner(tx, viewerId);
        const [receipt] = await tx
          .select()
          .from(creatorPublishingRequest)
          .where(eq(creatorPublishingRequest.id, requestId));
        if (receipt) {
          if (receipt.userId !== viewerId || receipt.inputHash !== inputHash)
            throw new CreatorError('This request was already used. Start a new transfer.', 409);
          const profile = await requireCreator(tx, receipt.creatorId, viewerId, true, true);
          return { id: profile.id, slug: profile.slug, moved: receipt.moved };
        }
        let profile: typeof creatorProfile.$inferSelect;
        let move = true;
        if ('creatorId' in target) {
          profile = await requireCreator(tx, target.creatorId, viewerId, true, true);
        } else {
          const { profile: input, transferPersonalArticles } = target.onboarding;
          assertCreatorProfileAllowed(input);
          [profile] = await tx
            .insert(creatorProfile)
            .values({ ownerId: viewerId, slug: input.slug, profile: input })
            .returning();
          move = transferPersonalArticles;
        }
        const moved = move
          ? await tx
              .update(creation)
              .set({
                creatorId: profile.id,
                ownerUserId: null,
                ownershipRevision: sql`${creation.ownershipRevision} + 1`,
              })
              .where(personalArticles(viewerId))
              .returning({ id: creation.id })
          : [];
        // Ownership changes do not create a content revision or publish pending edits.
        await tx.insert(creatorPublishingRequest).values({
          id: requestId,
          userId: viewerId,
          creatorId: profile.id,
          inputHash,
          moved: moved.length,
        });
        return { id: profile.id, slug: profile.slug, moved: moved.length };
      });
    } catch (error) {
      const code = error as { cause?: { code?: string }; code?: string };
      if (code.cause?.code === '23505' || code.code === '23505')
        throw new CreatorError(
          'That creator address or request is already in use. If this is your directory profile, contact SWUBASE on Discord to request access.',
          409,
        );
      throw error;
    }
  }
  return {
    async personalCounts(viewerId: string) {
      const [counts] = await database
        .select({
          total: sql<number>`count(*)::int`,
          drafts: sql<number>`count(*) FILTER (WHERE ${creation.published} IS NULL)::int`,
        })
        .from(creation)
        .where(personalArticles(viewerId));
      return counts;
    },
    onboard(viewerId: string, input: CreatorOnboarding) {
      return transfer(viewerId, input.requestId, { onboarding: input });
    },
    transferArticles(viewerId: string, creatorId: string, requestId: string) {
      return transfer(viewerId, requestId, { creatorId });
    },
  };
}
