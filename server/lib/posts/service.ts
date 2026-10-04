import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { post } from '../../db/schema/post.ts';
import { user } from '../../db/schema/auth-schema.ts';
import type { Post, PostDocument } from '../../../shared/posts/content.ts';

export interface PostsService {
  getProfile(authorId: string): Promise<{ userExists: boolean; post: Post | null }>;
  saveProfile(
    authorId: string,
    content: PostDocument,
    revision: number | null,
  ): Promise<Post | undefined>;
}
const profileWhere = (authorId: string) =>
  and(eq(post.authorId, authorId), eq(post.type, 'profile-description'));

export const postsService: PostsService = {
  async getProfile(authorId) {
    const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.id, authorId));
    if (!owner) return { userExists: false, post: null };
    const [data] = await db.select().from(post).where(profileWhere(authorId));
    return { userExists: true, post: data ?? null };
  },
  async saveProfile(authorId, content, revision) {
    const [data] =
      revision === null
        ? await db
            .insert(post)
            .values({ authorId, type: 'profile-description', content })
            .onConflictDoNothing()
            .returning()
        : await db
            .update(post)
            .set({ content, revision: sql`${post.revision} + 1`, updatedAt: sql`now()` })
            .where(and(profileWhere(authorId), eq(post.revision, revision)))
            .returning();
    return data;
  },
};
