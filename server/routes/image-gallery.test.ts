import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { createImageGalleryRoute } from './image-gallery.ts';
import type { GalleryImage } from '../../types/ImageGallery.ts';
import { UserFileError } from '../lib/user-files/errors.ts';
import { HTTPException } from 'hono/http-exception';
import { imageGalleryService } from '../lib/image-gallery/service.ts';

test('gallery reads are public; only admins can upload or delete, before body parsing', async () => {
  const rows = new Map<string, GalleryImage>();
  let role: 'anonymous' | 'user' | 'admin' = 'anonymous';
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      if (role !== 'anonymous')
        c.set('user', { id: 'gallery-admin' } as NonNullable<AuthExtension['Variables']['user']>);
      await next();
    })
    .route(
      '/gallery',
      createImageGalleryRoute(
        {
          async list() {
            return { images: [...rows.values()], hasMore: false, uploadsEnabled: true };
          },
          async create(title, file) {
            expect(file).toBeInstanceOf(File);
            const row: GalleryImage = {
              id: crypto.randomUUID(),
              title,
              width: 1600,
              height: 800,
              createdAt: new Date().toISOString(),
              url: 'https://images.example.com/art.webp',
              thumbnailUrl: 'https://images.example.com/thumb.webp',
            };
            rows.set(row.id, row);
            return row;
          },
          async remove(id) {
            if (!rows.delete(id)) throw new UserFileError('Gallery image not found.', 404);
            return { id };
          },
        },
        async c =>
          role === 'admin'
            ? { user: c.get('user')!, response: null }
            : {
                user: null,
                response: c.json({ message: 'Denied' }, role === 'anonymous' ? 401 : 403),
              },
      ),
    );
  const send = (path: string, method = 'GET', body?: FormData) =>
    app.request(`/gallery${path}`, { method, headers: { 'X-Requested-With': 'swubase' }, body });
  expect((await send('')).status).toBe(200);
  expect((await send('', 'POST')).status).toBe(401);
  expect((await send('/bad', 'DELETE')).status).toBe(401);
  role = 'user';
  expect((await send('', 'POST')).status).toBe(403);
  expect((await send('/bad', 'DELETE')).status).toBe(403);
  role = 'admin';
  expect((await app.request('/gallery', { method: 'POST' })).status).toBe(403);
  expect((await send('?page=-1')).status).toBe(400);
  expect((await send('/bad', 'DELETE')).status).toBe(400);
  const form = new FormData();
  form.set('title', '  A new hope  ');
  form.set('file', new File(['pixels'], 'art.png'));
  form.set('userId', 'someone-else');
  expect((await send('', 'POST', form)).status).toBe(400);
  form.delete('userId');
  const uploaded = await send('', 'POST', form);
  expect(uploaded.status).toBe(201);
  const { data } = await uploaded.json();
  expect(data.title).toBe('A new hope');
  expect((await send('/' + data.id, 'DELETE')).status).toBe(200);
  expect((await send('/' + data.id, 'DELETE')).status).toBe(404);
});

test('gallery returns client errors as 4xx and hides unexpected database details', async () => {
  for (const [failure, status] of [
    [new HTTPException(400, { message: 'Malformed form.' }), 400],
    [new Error('SQL private connection details'), 500],
  ] as const) {
    const route = createImageGalleryRoute({
      ...imageGalleryService,
      async list() {
        throw failure;
      },
    });
    const response = await route.request('/');
    expect(response.status).toBe(status);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.text()).not.toContain('private connection');
  }
});
