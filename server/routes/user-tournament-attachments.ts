import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import {
  attachmentCategories,
  attachmentCreateInput,
  attachmentUpdateInput,
  attachmentUploadInput,
  maxAttachmentBytes,
  preparationInput,
} from '../../types/TournamentAttachment.ts';
import { tournamentAttachmentService } from '../lib/tournament-attachments/service.ts';
import { AttachmentError } from '../lib/tournament-attachments/storage.ts';
const eventParams = z.object({ tournamentId: z.uuid() });
const itemParams = eventParams.extend({ id: z.uuid() });
export function createTournamentAttachmentsRoute(service = tournamentAttachmentService) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof AttachmentError) return c.json({ message: error.message }, error.status);
      if (error instanceof HTTPException && error.status < 500)
        return c.json(
          { message: error.status === 413 ? 'This attachment is too large.' : 'Invalid request.' },
          error.status,
        );
      // Database errors may include private notes and titles in their SQL parameters.
      // Hono/Sentry middleware can inspect c.error even after this handler responds.
      c.error = new Error('Could not process this private tournament attachment.');
      return c.json({ message: 'Could not process this attachment. Please try again.' }, 500);
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      c.header('Vary', 'Cookie');
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      // A browser cannot add this header in a cross-origin form submission.
      if (!['GET', 'HEAD'].includes(c.req.method) && c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    })
    .get('/:tournamentId', zValidator('param', eventParams), async c =>
      c.json({ data: await service.list(c.get('user')!.id, c.req.valid('param').tournamentId) }),
    )
    .put(
      '/:tournamentId/categories/:category',
      zValidator('param', eventParams.extend({ category: z.enum(attachmentCategories) })),
      zValidator('json', preparationInput),
      async c => {
        const { tournamentId, category } = c.req.valid('param');
        return c.json({
          data: await service.setCategory(
            c.get('user')!.id,
            tournamentId,
            category,
            c.req.valid('json').status,
          ),
        });
      },
    )
    .post(
      '/:tournamentId',
      bodyLimit({ maxSize: 100_000 }),
      zValidator('param', eventParams),
      zValidator('json', attachmentCreateInput),
      async c =>
        c.json(
          {
            data: await service.create(
              c.get('user')!.id,
              c.req.valid('param').tournamentId,
              c.req.valid('json'),
            ),
          },
          201,
        ),
    )
    .post(
      '/:tournamentId/files',
      bodyLimit({ maxSize: maxAttachmentBytes + 64 * 1024 }),
      zValidator('param', eventParams),
      zValidator('form', attachmentUploadInput),
      async c =>
        c.json(
          {
            data: await service.create(
              c.get('user')!.id,
              c.req.valid('param').tournamentId,
              c.req.valid('form'),
            ),
          },
          201,
        ),
    )
    .patch(
      '/:tournamentId/:id',
      bodyLimit({ maxSize: 100_000 }),
      zValidator('param', itemParams),
      zValidator('json', attachmentUpdateInput),
      async c => {
        const { tournamentId, id } = c.req.valid('param');
        return c.json({
          data: await service.update(c.get('user')!.id, tournamentId, id, c.req.valid('json')),
        });
      },
    )
    .delete('/:tournamentId/:id', zValidator('param', itemParams), async c => {
      const { tournamentId, id } = c.req.valid('param');
      return c.json({ data: await service.remove(c.get('user')!.id, tournamentId, id) });
    })
    .get('/:tournamentId/:id/file', zValidator('param', itemParams), async c => {
      const { tournamentId, id } = c.req.valid('param');
      const { attachment, body } = await service.download(c.get('user')!.id, tournamentId, id);
      const filename = encodeURIComponent(attachment.fileName!).replace(
        /['()*]/g,
        char => `%${char.charCodeAt(0).toString(16)}`,
      );
      c.header('Content-Type', attachment.mimeType!);
      c.header(
        'Content-Disposition',
        `attachment; filename="attachment"; filename*=UTF-8''${filename}`,
      );
      c.header('X-Content-Type-Options', 'nosniff');
      c.header('Content-Security-Policy', "default-src 'none'; sandbox");
      c.header('Referrer-Policy', 'no-referrer');
      return c.body(new Uint8Array(body).buffer);
    });
}
export const userTournamentAttachmentsRoute = createTournamentAttachmentsRoute();
