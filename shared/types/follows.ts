import { z } from 'zod';

export const followKindSchema = z.enum(['users', 'creators']);
export type FollowKind = z.infer<typeof followKindSchema>;
export const followTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('users'), id: z.string().min(1).max(255) }),
  z.object({ kind: z.literal('creators'), id: z.uuid() }),
]);
export const followStatusQuerySchema = z.object({
  ids: z
    .string()
    .max(6200)
    .transform(value => [...new Set(value.split(','))])
    .pipe(z.array(z.string().min(1).max(255)).min(1).max(24)),
});
export const followingQuerySchema = z.object({
  kind: followKindSchema,
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export interface FollowStatus {
  following: boolean;
  followerCount: number;
  canFollow: boolean;
}
export type FollowStatuses = Record<string, FollowStatus>;
export interface FollowingItem {
  id: string;
  name: string;
  image: string | null;
  slug: string | null;
  followedAt: string;
}
export interface FollowingPage {
  items: FollowingItem[];
  hasMore: boolean;
}
