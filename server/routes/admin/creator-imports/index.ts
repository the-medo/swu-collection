import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import {
  creatorImportSchema,
  creatorImportApplySchema,
  MAX_CREATOR_IMPORT_BYTES,
} from '../../../../shared/creators/imports.ts';
import { createCreatorImportService } from '../../../lib/creators/imports.ts';
import { CreatorError } from '../../../lib/creators/errors.ts';
import { ProfanityError } from '../../../lib/moderation/content.ts';

export function createCreatorImportRouter(
  service = createCreatorImportService(),
  authorize = requireAdmin,
) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      const access = await authorize(c);
      if (access.response) return access.response;
      if (c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    })
    .use(
      '*',
      bodyLimit({
        maxSize: MAX_CREATOR_IMPORT_BYTES + 1024,
        onError: c => c.json({ message: 'The import exceeds 5 MiB.' }, 413),
      }),
    )
    .use('*', async (c, next) => {
      // Cache the bounded body before JSON validation, which otherwise hides streamed size errors as malformed JSON.
      try {
        await c.req.arrayBuffer();
      } catch (error) {
        if (error instanceof Error && error.name === 'BodyLimitError')
          return c.json({ message: 'The import exceeds 5 MiB.' }, 413);
        throw error;
      }
      await next();
    })
    .onError((error, c) => {
      if (error instanceof HTTPException && error.status === 413)
        return c.json({ message: 'The import exceeds 5 MiB.' }, 413);
      if (error instanceof HTTPException && error.status === 400)
        return c.json({ message: 'Invalid JSON.' }, 400);
      if (error instanceof CreatorError) return c.json({ message: error.message }, error.status);
      if (error instanceof ProfanityError) return error.getResponse();
      if (error instanceof ZodError) return c.json({ message: 'Invalid creator import.' }, 400);
      c.error = new Error('Creator import failed.');
      return c.json({ message: 'Could not import this file. Please try again.' }, 500);
    })
    .post('/preview', zValidator('json', creatorImportSchema), async c =>
      c.json({ data: await service.preview(c.req.valid('json')) }),
    )
    .post('/apply', zValidator('json', creatorImportApplySchema), async c => {
      const input = c.req.valid('json');
      return c.json({ data: await service.apply(input.payload, input.fingerprint) });
    });
}

export const creatorImportAdminRoute = createCreatorImportRouter();
