import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { ZodError } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import {
  aiActivationSchema,
  aiSelectionSchema,
} from '../../../../shared/types/crossfire-ai-releases.ts';
import { AiError } from '../../../../play/ai/releases/objects.ts';
import type { CrossfireAiReleases } from '../../../lib/crossfire/aiReleases.ts';

export function createAiReleaseRouter(
  service: () => Pick<CrossfireAiReleases, 'status' | 'preview' | 'activate'> &
    Partial<Pick<CrossfireAiReleases, 'importRelease'>>,
  authorize = requireAdmin,
) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      const result = await authorize(c);
      if (result.response) return result.response;
      await next();
    })
    .onError((error, c) => {
      if (error instanceof AiError) return c.json({ message: error.message }, 409);
      if (error instanceof ZodError)
        return c.json({ message: 'AI release failed validation' }, 400);
      throw error;
    })
    .get('/', async c => c.json({ data: await service().status() }))
    .post('/upload', bodyLimit({ maxSize: 35_000_000 }), async c => {
      if (!process.env.BETTER_AUTH_URL || c.req.header('Origin') !== process.env.BETTER_AUTH_URL)
        return c.json({ message: 'Invalid origin' }, 403);
      let form: FormData;
      try {
        form = await c.req.raw.formData();
      } catch {
        return c.json({ message: 'Invalid upload form' }, 400);
      }
      const manifest = form.get('manifest'),
        weights = form.get('weights');
      if (
        !(manifest instanceof File) ||
        !(weights instanceof File) ||
        manifest.size > 2_000_000 ||
        weights.size > 32_000_000
      )
        return c.json({ message: 'Choose release.json and its model.pt file' }, 400);
      let parsed: unknown;
      try {
        parsed = JSON.parse(await manifest.text());
      } catch {
        return c.json({ message: 'Invalid release JSON' }, 400);
      }
      const target = service();
      if (!target.importRelease) return c.json({ message: 'Release upload unavailable' }, 503);
      return c.json({
        data: await target.importRelease(parsed, Buffer.from(await weights.arrayBuffer())),
      });
    })
    .post('/preview', zValidator('json', aiSelectionSchema), async c =>
      c.json({ data: await service().preview(c.req.valid('json')) }),
    )
    .post('/activate', zValidator('json', aiActivationSchema), async c => {
      await service().activate(c.req.valid('json'), c.get('user')!.id);
      return c.json({ data: { activated: true } });
    });
}
