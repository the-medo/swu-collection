import { describe, expect, test, mock } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { createPostsRoute } from './posts.ts';
import type { PostsService } from '../lib/posts/service.ts';
import { emptyPostDocument, type Post } from '../../shared/posts/content.ts';

const content = emptyPostDocument();
const row: Post = {
  id: crypto.randomUUID(),
  authorId: 'owner',
  type: 'profile-description',
  content,
  revision: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
function setup(viewerId?: string, overrides: Partial<PostsService> = {}) {
  const service = {
    getProfile: mock(async () => ({ userExists: true, post: row })),
    saveProfile: mock(async () => row as Post | undefined),
    ...overrides,
  };
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      if (viewerId)
        c.set('user', { id: viewerId } as NonNullable<AuthExtension['Variables']['user']>);
      await next();
    })
    .route('/', createPostsRoute(service));
  const put = (body: unknown, userId = 'owner') =>
    app.request(`/profile/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(new TextEncoder().encode(JSON.stringify(body)).length),
      },
      body: JSON.stringify(body),
    });
  return { app, put, service };
}
describe('profile post API', () => {
  test('rejects rich widgets even when an owner requests rich editor permissions', async () => {
    const owner = setup('owner');
    const rich = {
      version: 1,
      blocks: [
        {
          id: 'deck',
          type: 'swuBlock',
          children: [],
          props: {
            data: JSON.stringify({ kind: 'decklist', deck: { deckId: crypto.randomUUID() } }),
          },
        },
      ],
    };
    const response = await owner.put({ content: rich, revision: null });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('SWUBASE widgets and mentions');
    expect((await owner.put({ content: rich, revision: null, type: 'rich' })).status).toBe(400);
    expect(owner.service.saveProfile).not.toHaveBeenCalled();
  });

  test('authorization precedes body validation and never invokes persistence for other users', async () => {
    const anonymous = setup();
    expect((await anonymous.put({ invalid: true })).status).toBe(401);
    expect(anonymous.service.saveProfile).not.toHaveBeenCalled();
    const other = setup('someone-else');
    expect((await other.put({ invalid: true })).status).toBe(403);
    expect(other.service.saveProfile).not.toHaveBeenCalled();
  });
  test('public reads distinguish an empty profile from a missing user', async () => {
    const visible = setup();
    expect((await (await visible.app.request('/profile/owner')).json()).data).toEqual(row);
    const empty = setup(undefined, { getProfile: async () => ({ userExists: true, post: null }) });
    expect(await (await empty.app.request('/profile/owner')).json()).toEqual({ data: null });
    const missing = setup(undefined, {
      getProfile: async () => ({ userExists: false, post: null }),
    });
    expect((await missing.app.request('/profile/missing')).status).toBe(404);
  });
  test('owner saves pass the authenticated author and expected revision; stale saves return 409', async () => {
    const owner = setup('owner');
    expect((await owner.put({ content, revision: null })).status).toBe(200);
    expect(owner.service.saveProfile).toHaveBeenLastCalledWith('owner', content, null);
    expect((await owner.put({ content, revision: 1 })).status).toBe(200);
    expect(owner.service.saveProfile).toHaveBeenLastCalledWith('owner', content, 1);
    const stale = setup('owner', { saveProfile: async () => undefined });
    expect((await stale.put({ content, revision: 1 })).status).toBe(409);
  });
  test('invalid, oversized, and forged author payloads never reach persistence', async () => {
    const owner = setup('owner');
    expect((await owner.put({ content: {}, revision: null })).status).toBe(400);
    expect((await owner.put({ content, revision: null, authorId: 'someone-else' })).status).toBe(
      400,
    );
    expect((await owner.put({ content: 'x'.repeat(270_000), revision: null })).status).toBe(413);
    expect(owner.service.saveProfile).not.toHaveBeenCalled();
  });
});
