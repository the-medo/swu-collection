import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { createUserHeaderRoute } from './header.ts';
import { UserFileError } from '../../lib/user-files/errors.ts';
import type { UserHeader, UserHeaderInput } from '../../../types/UserHeader.ts';

const header: UserHeader = { source: 'battlefield', image: null, width: null, height: null };
const input = {
  source: 'upload',
  fileId: crypto.randomUUID(),
  crop: { left: 0, top: 0, width: 1600, height: 400 },
};
test('public header reads exclude provenance; private settings and saves always use the session owner', async () => {
  let owner: string | null = null;
  let time = 1000;
  const saved: { userId: string; input: UserHeaderInput }[] = [];
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      if (owner) c.set('user', { id: owner } as NonNullable<AuthExtension['Variables']['user']>);
      await next();
    })
    .route(
      '/user',
      createUserHeaderRoute(
        {
          async get(id) {
            if (id === 'missing') throw new UserFileError('User not found.', 404);
            return header;
          },
          async getSettings(id) {
            expect(id).toBe('session-owner');
            return { header, selection: null, crop: null };
          },
          async save(userId, input) {
            saved.push({ userId, input });
            return header;
          },
        },
        () => time,
      ),
    );
  app.get('/user/ordinary', c => c.json({ ok: true }));
  expect((await app.request('/user/ordinary')).headers.get('Cache-Control')).toBeNull();
  const send = (value: unknown, requestedWith = true) =>
    app.request('/user/header', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(requestedWith ? { 'X-Requested-With': 'swubase' } : {}),
      },
      body: JSON.stringify(value),
    });
  expect((await app.request('/user/public-owner/header')).status).toBe(200);
  expect((await app.request('/user/missing/header')).status).toBe(404);
  expect((await app.request('/user/header')).status).toBe(401);
  expect((await send(input)).status).toBe(401);
  owner = 'session-owner';
  expect((await app.request('/user/header?userId=another-owner')).status).toBe(200);
  expect((await send(input, false)).status).toBe(403);
  for (const invalid of [
    { ...input, userId: 'someone-else' },
    { ...input, imageUrl: 'https://example.com' },
    { ...input, crop: { ...input.crop, width: 3, height: 1 } },
    { ...input, crop: { ...input.crop, height: 401 } },
    { ...input, crop: { ...input.crop, width: 1500, height: 376 } },
    { ...input, crop: { ...input.crop, width: 1500, height: 400 } },
    {
      source: 'gallery',
      galleryImageId: crypto.randomUUID(),
      crop: { ...input.crop, width: 1500, height: 376 },
    },
    { source: 'battlefield', crop: input.crop },
    { source: 'gallery', galleryImageId: 'bad', crop: input.crop },
  ])
    expect((await send(invalid)).status).toBe(400);
  expect(
    (
      await app.request('/user/header', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'swubase',
          'Content-Length': '3100',
        },
        body: JSON.stringify({ source: 'battlefield', junk: 'a'.repeat(3000) }),
      })
    ).status,
  ).toBe(413);
  expect(saved).toHaveLength(0);
  for (const [width, height] of [
    [800, 200],
    [1500, 300],
    [2000, 500],
    [8192, 2048],
    [1500, 375],
  ])
    expect((await send({ ...input, crop: { ...input.crop, width, height } })).status).toBe(200);
  expect(saved.every(row => row.userId === 'session-owner')).toBe(true);
  const limited = await send(input);
  expect(limited.status).toBe(429);
  expect(limited.headers.get('Retry-After')).toBeTruthy();
  time += 60_001;
  expect((await send({ source: 'battlefield' })).status).toBe(200);
});

test('header save admission rejects concurrent saves and releases after a failed request', async () => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => {
    release = resolve;
  });
  let fail = true;
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set('user', { id: 'concurrent-owner' } as NonNullable<AuthExtension['Variables']['user']>);
      await next();
    })
    .route(
      '/user',
      createUserHeaderRoute({
        async get() {
          return header;
        },
        async getSettings() {
          return { header, selection: null, crop: null };
        },
        async save() {
          if (fail) {
            await pending;
            throw new UserFileError('R2 unavailable.', 502);
          }
          return header;
        },
      }),
    );
  const send = () =>
    app.request('/user/header', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'swubase' },
      body: JSON.stringify(input),
    });
  const first = send();
  await new Promise(resolve => setTimeout(resolve, 10));
  expect((await send()).status).toBe(429);
  release();
  expect((await first).status).toBe(502);
  fail = false;
  expect((await send()).status).toBe(200);
});
