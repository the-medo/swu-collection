import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { hc } from 'hono/client';
import type { AuthExtension } from '../auth/auth.ts';
import { createUserFilesRoute } from './user-files.ts';
import { userFileService } from '../lib/user-files/service.ts';
import { userFileUploadForm } from '../../frontend/src/api/user-files/uploadForm.ts';

test('the typed upload client accepts omitted, image and header purposes through multipart validation', async () => {
  const calls: { userId: string; purpose?: string; fileName: string }[] = [];
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set('user', { id: 'upload-client-owner' } as NonNullable<
        AuthExtension['Variables']['user']
      >);
      await next();
    })
    .route(
      '/api/user-files',
      createUserFilesRoute({
        ...userFileService,
        async create(userId, file, purpose) {
          calls.push({ userId, purpose, fileName: file.name });
          return {
            id: crypto.randomUUID(),
            fileName: file.name,
            width: 1600,
            height: 800,
            originalByteSize: file.size,
            byteSize: file.size,
            thumbnailByteSize: 1,
            createdAt: new Date().toISOString(),
            url: 'https://images.example.com/image.webp',
            thumbnailUrl: 'https://images.example.com/thumb.webp',
          };
        },
      }),
    );
  const client = hc<typeof app>('http://localhost', {
    fetch: (input, init) => app.request(input instanceof Request ? input : input.toString(), init),
  });
  for (const purpose of [undefined, 'image', 'header'] as const) {
    const response = await client.api['user-files'].$post(
      { form: userFileUploadForm(new File(['pixels'], 'art.png'), purpose) },
      { headers: { 'X-Requested-With': 'swubase' } },
    );
    expect(response.status).toBe(201);
    expect(calls.at(-1)).toEqual({ userId: 'upload-client-owner', purpose, fileName: 'art.png' });
  }
});
