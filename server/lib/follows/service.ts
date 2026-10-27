import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { creatorProfile } from '../../db/schema/creator_hub.ts';
import { creatorFollow, userFollow } from '../../db/schema/follow.ts';
import type { FollowKind, FollowStatuses, FollowingPage } from '../../../shared/types/follows.ts';

const canFollow = (kind: FollowKind, id: string, viewerId?: string) =>
  viewerId !== 'swubase' && (kind === 'creators' || (id !== 'swubase' && id !== viewerId));

export function createFollowService(database = db) {
  async function statuses(
    kind: FollowKind,
    ids: string[],
    viewerId?: string,
  ): Promise<FollowStatuses> {
    const relation = kind === 'users' ? userFollow : creatorFollow;
    const target = kind === 'users' ? userFollow.followedUserId : creatorFollow.creatorId;
    const targets =
      kind === 'users'
        ? await database.select({ id: user.id }).from(user).where(inArray(user.id, ids))
        : await database
            .select({ id: creatorProfile.id })
            .from(creatorProfile)
            .where(inArray(creatorProfile.id, ids));
    const counts = await database
      .select({ id: target, count: count() })
      .from(relation)
      .where(inArray(target, ids))
      .groupBy(target);
    const followed = viewerId
      ? await database
          .select({ id: target })
          .from(relation)
          .where(and(eq(relation.followerUserId, viewerId), inArray(target, ids)))
      : [];
    const countById = new Map(counts.map(row => [row.id, row.count]));
    const followedIds = new Set(followed.map(row => row.id));
    return Object.fromEntries(
      targets.map(({ id }) => [
        id,
        {
          following: followedIds.has(id),
          followerCount: countById.get(id) ?? 0,
          canFollow: canFollow(kind, id, viewerId),
        },
      ]),
    );
  }

  return {
    statuses,
    async set(kind: FollowKind, id: string, viewerId: string, following: boolean) {
      if (!canFollow(kind, id, viewerId))
        throw new HTTPException(400, { message: 'You cannot follow this account.' });
      const targetId = await database.transaction(async tx => {
        // Keep the target alive until the foreign-key write has completed.
        const targets =
          kind === 'users'
            ? await tx.select({ id: user.id }).from(user).where(eq(user.id, id)).for('key share')
            : await tx
                .select({ id: creatorProfile.id })
                .from(creatorProfile)
                .where(eq(creatorProfile.id, id))
                .for('key share');
        if (!targets.length) throw new HTTPException(404, { message: 'Profile not found.' });
        if (kind === 'users') {
          if (following)
            await tx
              .insert(userFollow)
              .values({ followerUserId: viewerId, followedUserId: id })
              .onConflictDoNothing();
          else
            await tx
              .delete(userFollow)
              .where(
                and(eq(userFollow.followerUserId, viewerId), eq(userFollow.followedUserId, id)),
              );
        } else {
          if (following)
            await tx
              .insert(creatorFollow)
              .values({ followerUserId: viewerId, creatorId: id })
              .onConflictDoNothing();
          else
            await tx
              .delete(creatorFollow)
              .where(
                and(eq(creatorFollow.followerUserId, viewerId), eq(creatorFollow.creatorId, id)),
              );
        }
        return targets[0].id;
      });
      return (await statuses(kind, [targetId], viewerId))[targetId];
    },
    async list(kind: FollowKind, viewerId: string, page: number): Promise<FollowingPage> {
      const limit = 24;
      const items =
        kind === 'users'
          ? await database
              .select({
                id: user.id,
                name: user.displayName,
                image: user.image,
                slug: sql<null>`NULL`,
                followedAt: userFollow.createdAt,
              })
              .from(userFollow)
              .innerJoin(user, eq(user.id, userFollow.followedUserId))
              .where(eq(userFollow.followerUserId, viewerId))
              .orderBy(desc(userFollow.createdAt), asc(userFollow.followedUserId))
              .limit(limit + 1)
              .offset((page - 1) * limit)
          : await database
              .select({
                id: creatorProfile.id,
                name: sql<string>`${creatorProfile.profile}->>'name'`,
                image: sql<string | null>`${creatorProfile.profile}->>'avatarUrl'`,
                slug: creatorProfile.slug,
                followedAt: creatorFollow.createdAt,
              })
              .from(creatorFollow)
              .innerJoin(creatorProfile, eq(creatorProfile.id, creatorFollow.creatorId))
              .where(eq(creatorFollow.followerUserId, viewerId))
              .orderBy(desc(creatorFollow.createdAt), asc(creatorFollow.creatorId))
              .limit(limit + 1)
              .offset((page - 1) * limit);
      return { items: items.slice(0, limit), hasMore: items.length > limit };
    },
  };
}
export const followService = createFollowService();
