import { sql, type AnyColumn } from 'drizzle-orm';
import { creatorFollow, userFollow } from '../../db/schema/follow.ts';

export const followsUser = (viewerId: string, target: AnyColumn) => sql`EXISTS (
  SELECT 1 FROM ${userFollow}
  WHERE ${userFollow.followerUserId} = ${viewerId} AND ${userFollow.followedUserId} = ${target}
)`;
export const followsCreator = (viewerId: string, target: AnyColumn) => sql`EXISTS (
  SELECT 1 FROM ${creatorFollow}
  WHERE ${creatorFollow.followerUserId} = ${viewerId} AND ${creatorFollow.creatorId} = ${target}
)`;
