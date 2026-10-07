import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { createTeamHeaderRoute } from './index.ts';
import { UserFileError } from '../../../../lib/user-files/errors.ts';
import type { TeamHeader, TeamHeaderInput } from '../../../../../types/TeamHeader.ts';

const header: TeamHeader = { source: null, image: null, width: null, height: null };
const teamId = crypto.randomUUID();
const input = {
  source: 'upload',
  fileId: crypto.randomUUID(),
  crop: { left: 0, top: 0, width: 1600, height: 400 },
};

test('team header reads are public; settings and saves require owners and never accept battlefield', async () => {
  let viewer: string | null = null;
  let time = 1000;
  const saves: { id: string; userId: string; input: TeamHeaderInput }[] = [];
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      if (viewer) c.set('user', { id: viewer } as NonNullable<AuthExtension['Variables']['user']>);
      await next();
    })
    .route(
      '/teams/:id/header',
      createTeamHeaderRoute(
        {
          async get(id) {
            if (id !== teamId) throw new UserFileError('Team not found.', 404);
            return header;
          },
          async getSettings(id, userId) {
            expect(id).toBe(teamId);
            expect(userId).toBe('team-header-owner');
            return { header, selection: null, crop: null };
          },
          async canEdit(id, userId) {
            return id === teamId && userId === 'team-header-owner';
          },
          async save(id, userId, input) {
            saves.push({ id, userId, input });
            return header;
          },
        },
        () => time,
      ),
    );
  app.get('/teams/ordinary', c => c.json({ ok: true }));
  const url = `/teams/${teamId}/header`;
  const send = (value: unknown, requestedWith = true) =>
    app.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(requestedWith ? { 'X-Requested-With': 'swubase' } : {}),
      },
      body: JSON.stringify(value),
    });
  expect((await app.request('/teams/ordinary')).headers.get('Cache-Control')).toBeNull();
  expect((await app.request(url)).status).toBe(200);
  expect((await app.request(`/teams/${crypto.randomUUID()}/header`)).status).toBe(404);
  expect((await app.request('/teams/invalid/header')).status).toBe(400);
  expect((await app.request(url + '/settings')).status).toBe(401);
  expect((await send(input)).status).toBe(401);
  for (const denied of ['team-header-member', 'team-header-outsider']) {
    viewer = denied;
    expect((await app.request(url + '/settings')).status).toBe(403);
    expect((await send(input)).status).toBe(403);
  }
  viewer = 'team-header-owner';
  const settings = await app.request(url + '/settings?userId=another-owner');
  expect(settings.status).toBe(200);
  expect(settings.headers.get('Cache-Control')).toBe('private, no-store');
  expect(settings.headers.get('Vary')).toBe('Cookie');
  expect((await send(input, false)).status).toBe(403);
  for (const invalid of [
    { source: 'battlefield' },
    { source: 'none', crop: input.crop },
    { ...input, userId: 'another-owner' },
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
    { source: 'gallery', galleryImageId: 'bad', crop: input.crop },
  ])
    expect((await send(invalid)).status).toBe(400);
  expect(
    (
      await app.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'swubase',
          'Content-Length': '3100',
        },
        body: JSON.stringify({ source: 'none', junk: 'a'.repeat(3000) }),
      })
    ).status,
  ).toBe(413);
  expect(saves).toHaveLength(0);
  for (const [width, height] of [
    [800, 200],
    [1500, 300],
    [2000, 500],
    [8192, 2048],
    [1500, 375],
  ])
    expect((await send({ ...input, crop: { ...input.crop, width, height } })).status).toBe(200);
  expect(saves.every(save => save.id === teamId && save.userId === viewer)).toBe(true);
  const limited = await send(input);
  expect(limited.status).toBe(429);
  expect(limited.headers.get('Retry-After')).toBeTruthy();
  time += 60_001;
  expect((await send({ source: 'none' })).status).toBe(200);
  expect(saves.at(-1)?.input).toEqual({ source: 'none' });
});

test('team header failures release image admission and hide internal errors', async () => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => {
    release = resolve;
  });
  let fail = true;
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set('user', { id: 'team-header-concurrent-owner' } as NonNullable<
        AuthExtension['Variables']['user']
      >);
      await next();
    })
    .route(
      '/teams/:id/header',
      createTeamHeaderRoute({
        async get() {
          return header;
        },
        async getSettings() {
          return { header, selection: null, crop: null };
        },
        async canEdit() {
          return true;
        },
        async save() {
          if (fail) {
            await pending;
            throw new Error('secret database details');
          }
          return header;
        },
      }),
    );
  const send = () =>
    app.request(`/teams/${teamId}/header`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'swubase' },
      body: JSON.stringify(input),
    });
  const first = send();
  await new Promise(resolve => setTimeout(resolve, 10));
  for (let i = 0; i < 5; i++) expect((await send()).status).toBe(429);
  release();
  const failed = await first;
  expect(failed.status).toBe(500);
  expect(await failed.text()).not.toContain('secret');
  fail = false;
  // Contention did not spend the allowance; the failed processing attempt did.
  for (let i = 0; i < 4; i++) expect((await send()).status).toBe(200);
  expect((await send()).status).toBe(429);
});
