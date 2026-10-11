import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { z, ZodError } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import {
  artistExportSchema,
  artistTransferApplySchema,
  artistTransferPreviewSchema,
  MAX_ARTIST_EXPORT_BYTES,
} from '../../../../shared/types/artistTransfer.ts';
import type { ArtistTransferAdmin } from '../../../lib/artists/admin.ts';
import { ArtistTransferError } from '../../../lib/artists/errors.ts';

export function createArtistTransferRouter(service: ArtistTransferAdmin, authorize = requireAdmin) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      const access = await authorize(c);
      if (access.response) return access.response;
      await next();
    })
    .use(
      '*',
      bodyLimit({
        maxSize: MAX_ARTIST_EXPORT_BYTES,
        onError: c => c.json({ message: 'Artist snapshot exceeds 10 MiB.' }, 413),
      }),
    )
    .onError((error, c) => {
      if (error instanceof ArtistTransferError)
        return c.json({ message: error.message }, error.status);
      if (error instanceof ZodError)
        return c.json({ message: 'Artist data failed validation.' }, 400);
      throw error;
    })
    .get('/', async c => c.json({ data: await service.status() }))
    .get('/snapshots', zValidator('query', z.object({}).strict()), async c =>
      c.json({ data: await service.list() }),
    )
    .get('/export', async c => {
      c.header('Content-Disposition', 'attachment; filename="artist-profiles.json"');
      return c.json(await service.export());
    })
    .post('/publish', async c => c.json({ data: await service.publish() }, 201))
    .post('/upload', zValidator('json', artistExportSchema), async c =>
      c.json({ data: await service.publish(c.req.valid('json')) }, 201),
    )
    .post('/preview', zValidator('json', artistTransferPreviewSchema), async c =>
      c.json({ data: await service.preview(c.req.valid('json')) }),
    )
    .post('/apply', zValidator('json', artistTransferApplySchema), async c =>
      c.json({ data: await service.apply(c.req.valid('json')) }),
    );
}
