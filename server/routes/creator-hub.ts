import { creatorDeckQuerySchema } from '../../shared/creators/contracts.ts';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { ProfanityError } from '../lib/moderation/content.ts';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { createCreatorTemplatesRoute } from './creator-templates.ts';
import {
  creatorProfileSchema,
  creatorOnboardingSchema,
  creationDocumentSchema,
  discoverySchema,
  entityTypes,
  entityReferenceSchema,
  languageSchema,
  youtubeChannelSchema,
  youtubeImportSettingsSchema,
} from '../../shared/creators/contracts.ts';
import { CreatorError, creatorService } from '../lib/creators/service.ts';
import { youtubeService } from '../lib/creators/youtube.ts';
import { channelImportsService } from '../lib/creators/channel-imports.ts';
import { requireAdmin } from '../auth/requireAdmin.ts';
import { creationReportsService } from '../lib/creators/reports.ts';
import {
  creationReportSchema,
  creationReportListSchema,
  creationReportDecisionSchema,
} from '../../shared/creators/reports.ts';
const id = z.object({ id: z.uuid() });
const revision = z.object({ revision: z.number().int().positive() });

export function createCreatorHubRoute(
  service = creatorService,
  youtube = youtubeService,
  reports = creationReportsService,
  channelImports = channelImportsService,
) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof CreatorError) return c.json({ message: error.message }, error.status);
      if (error instanceof ProfanityError) return error.getResponse();
      // Provider credentials and unpublished prose must never reach error telemetry.
      const code = (error as Error & { cause?: { code?: unknown } }).cause?.code;
      console.error('Creator hub request failed', {
        method: c.req.method,
        route: c.req.routePath,
        kind: error instanceof z.ZodError ? 'provider-contract' : 'unexpected',
        errorType: [
          'Error',
          'TypeError',
          'PostgresError',
          'DrizzleQueryError',
          'TimeoutError',
          'ZodError',
        ].includes(error.name)
          ? error.name
          : 'UnexpectedError',
        databaseCode: typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? code : undefined,
      });
      c.error = new Error('Creator hub request failed.');
      return c.json({ message: 'Could not complete this request. Please try again.' }, 500);
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      c.header('Referrer-Policy', 'no-referrer');
      if (!['GET', 'HEAD'].includes(c.req.method)) {
        if (!c.get('user')) return c.json({ message: 'Sign in to continue.' }, 401);
        if (c.req.header('X-Requested-With') !== 'swubase')
          return c.json({ message: 'Invalid request origin.' }, 403);
      }
      await next();
    })
    .use(
      '*',
      bodyLimit({
        maxSize: 350_000,
        onError: c => c.json({ message: 'Content is too large.' }, 413),
      }),
    )
    .use('/reports/*', async (c, next) => {
      const admin = await requireAdmin(c);
      if (admin.response) return admin.response;
      await next();
    })
    .get('/tags', async c => c.json({ data: await service.taxonomy() }))
    .route('/templates', createCreatorTemplatesRoute())
    .get('/reports', zValidator('query', creationReportListSchema), async c => {
      // Also guard the collection path independently of wildcard matching.
      const admin = await requireAdmin(c);
      if (admin.response) return admin.response;
      const { status, page } = c.req.valid('query');
      return c.json({ data: await reports.list(status, page) });
    })
    .post(
      '/reports/:id',
      zValidator('param', id),
      zValidator('json', creationReportDecisionSchema),
      async c =>
        c.json({
          data: await reports.decide(
            c.req.valid('param').id,
            c.get('user')!.id,
            c.req.valid('json'),
          ),
        }),
    )
    .get('/creations/:id/report', zValidator('param', id), async c => {
      if (!c.get('user')) return c.json({ message: 'Sign in to continue.' }, 401);
      return c.json({ data: await reports.status(c.req.valid('param').id, c.get('user')!.id) });
    })
    .post(
      '/creations/:id/report',
      zValidator('param', id),
      zValidator('json', creationReportSchema),
      async c =>
        c.json({
          data: await reports.submit(
            c.req.valid('param').id,
            c.get('user')!.id,
            c.req.valid('json').details,
            c.req.valid('json').clientReportId,
          ),
        }),
    )
    .get(
      '/creators',
      zValidator(
        'query',
        z.object({
          q: z.string().max(120).default(''),
          page: z.coerce.number().int().min(1).max(1000).default(1),
          language: languageSchema.optional(),
          tags: z.string().max(2000).optional(),
        }),
      ),
      async c =>
        c.json({
          data: await service.profiles(
            c.req.valid('query').q,
            c.req.valid('query').page,
            c.req.valid('query').language,
            c.req.valid('query').tags,
          ),
        }),
    )
    .get('/mine', async c => {
      if (!c.get('user')) return c.json({ message: 'Sign in to continue.' }, 401);
      return c.json({ data: await service.mine(c.get('user')!.id) });
    })
    .get(
      '/personal/articles',
      zValidator('query', z.object({ page: z.coerce.number().int().min(1).max(1000).default(1) })),
      async c => {
        if (!c.get('user')) return c.json({ message: 'Sign in to continue.' }, 401);
        return c.json({
          data: await service.studio(null, c.get('user')!.id, c.req.valid('query').page),
        });
      },
    )
    .get('/personal/counts', async c => {
      if (!c.get('user')) return c.json({ message: 'Sign in to continue.' }, 401);
      return c.json({ data: await service.personalCounts(c.get('user')!.id) });
    })
    .post('/creators/onboard', zValidator('json', creatorOnboardingSchema), async c =>
      c.json({ data: await service.onboard(c.get('user')!.id, c.req.valid('json')) }, 201),
    )
    .post(
      '/creators/:id/transfer-articles',
      zValidator('param', id),
      zValidator('json', z.object({ requestId: z.uuid() })),
      async c =>
        c.json({
          data: await service.transferArticles(
            c.get('user')!.id,
            c.req.valid('param').id,
            c.req.valid('json').requestId,
          ),
        }),
    )
    .post('/creators', zValidator('json', creatorProfileSchema), async c =>
      c.json({ data: await service.saveProfile(c.get('user')!.id, c.req.valid('json')) }, 201),
    )
    .get('/creators/:slug', zValidator('param', z.object({ slug: z.string().max(60) })), async c =>
      c.json({ data: await service.profile(c.req.valid('param').slug) }),
    )
    .put(
      '/creators/:id',
      zValidator('param', id),
      zValidator(
        'json',
        z.object({ profile: creatorProfileSchema, revision: revision.shape.revision }),
      ),
      async c =>
        c.json({
          data: await service.saveProfile(
            c.get('user')!.id,
            c.req.valid('json').profile,
            c.req.valid('param').id,
            c.req.valid('json').revision,
          ),
        }),
    )
    .get('/creators/:id/members', zValidator('param', id), async c => {
      if (!c.get('user')) return c.json({ message: 'Sign in to continue.' }, 401);
      return c.json({ data: await service.members(c.req.valid('param').id, c.get('user')!.id) });
    })
    .put(
      '/creators/:id/members',
      zValidator('param', id),
      zValidator('json', z.object({ userId: z.string().min(1).max(255), remove: z.boolean() })),
      async c => {
        await service.setMember(
          c.req.valid('param').id,
          c.get('user')!.id,
          c.req.valid('json').userId,
          c.req.valid('json').remove,
        );
        return c.json({ data: true });
      },
    )
    .get(
      '/creators/:id/decks',
      zValidator('param', id),
      zValidator('query', creatorDeckQuerySchema),
      async c =>
        c.json({ data: await service.decks(c.req.valid('param').id, c.req.valid('query')) }),
    )
    .get('/creators/:id/collections', zValidator('param', id), async c =>
      c.json({ data: await service.collections(c.req.valid('param').id) }),
    )
    .get('/creators/:id/counts', zValidator('param', id), async c =>
      c.json({ data: await service.sectionCounts(c.req.valid('param').id) }),
    )
    .get(
      '/creators/:id/studio',
      zValidator('param', id),
      zValidator('query', z.object({ page: z.coerce.number().int().min(1).max(1000).default(1) })),
      async c => {
        if (!c.get('user')) return c.json({ message: 'Sign in to continue.' }, 401);
        return c.json({
          data: await service.studio(
            c.req.valid('param').id,
            c.get('user')!.id,
            c.req.valid('query').page,
          ),
        });
      },
    )
    .get(
      '/subjects',
      zValidator(
        'query',
        z.object({
          type: z.enum(entityTypes),
          q: z.string().trim().max(100).default(''),
          scope: z.enum(['discovery', 'authoring']).default('discovery'),
          page: z.coerce.number().int().min(1).max(1000).default(1),
        }),
      ),
      async c =>
        c.json({
          data: await service.subjects(
            c.req.valid('query').type,
            c.req.valid('query').q,
            c.req.valid('query').scope,
            { userId: c.get('user')?.id, page: c.req.valid('query').page },
          ),
        }),
    )
    .post(
      '/subjects/resolve',
      zValidator('json', z.object({ references: z.array(entityReferenceSchema).max(50) })),
      async c => c.json({ data: await service.resolveSubjects(c.req.valid('json').references) }),
    )
    .get('/creations', zValidator('query', discoverySchema), async c =>
      c.json({ data: await service.discover(c.req.valid('query')) }),
    )
    .get('/creations/:id', zValidator('param', id), async c =>
      c.json({ data: await service.get(c.req.valid('param').id) }),
    )
    .get('/creations/:id/draft', zValidator('param', id), async c =>
      c.json({ data: await service.get(c.req.valid('param').id, c.get('user')?.id, true) }),
    )
    .get('/creations/:id/revisions', zValidator('param', id), async c => {
      if (!c.get('user')) return c.json({ message: 'Sign in to continue.' }, 401);
      return c.json({ data: await service.revisions(c.req.valid('param').id, c.get('user')!.id) });
    })
    .post(
      '/creations',
      zValidator(
        'json',
        z.object({ creatorId: z.uuid().nullable(), document: creationDocumentSchema }),
      ),
      async c =>
        c.json(
          {
            data: await service.save(
              c.req.valid('json').creatorId,
              c.get('user')!.id,
              c.req.valid('json').document,
            ),
          },
          201,
        ),
    )
    .put(
      '/creations/:id',
      zValidator('param', id),
      zValidator(
        'json',
        z.object({
          creatorId: z.uuid().nullable(),
          ownershipRevision: z.number().int().positive().default(1),
          document: creationDocumentSchema,
          revision: revision.shape.revision,
        }),
      ),
      async c =>
        c.json({
          data: await service.save(
            c.req.valid('json').creatorId,
            c.get('user')!.id,
            c.req.valid('json').document,
            c.req.valid('param').id,
            c.req.valid('json').revision,
            undefined,
            undefined,
            undefined,
            c.req.valid('json').ownershipRevision,
          ),
        }),
    )
    .post(
      '/creations/:id/publish',
      zValidator('param', id),
      zValidator(
        'json',
        revision.extend({
          unpublish: z.boolean().default(false),
          ownershipRevision: z.number().int().positive().default(1),
        }),
      ),
      async c => {
        await service.publish(
          c.req.valid('param').id,
          c.get('user')!.id,
          c.req.valid('json').revision,
          c.req.valid('json').unpublish,
          c.req.valid('json').ownershipRevision,
        );
        return c.json({ data: true });
      },
    )
    .get('/creators/:id/youtube', zValidator('param', id), async c => {
      if (!c.get('user')) return c.json({ message: 'Sign in to continue.' }, 401);
      return c.json({ data: await youtube.status(c.req.valid('param').id, c.get('user')!.id) });
    })
    .post('/creators/:id/youtube', zValidator('param', id), async c =>
      c.json({
        data: await youtube.connect(
          c.req.valid('param').id,
          c.get('user')!.id,
          c.get('session')!.id,
        ),
      }),
    )
    .delete(
      '/creators/:id/youtube',
      zValidator('param', id),
      zValidator('json', z.object({ channelId: z.string().regex(/^UC[\w-]{22}$/) })),
      async c => {
        await youtube.disconnect(
          c.req.valid('param').id,
          c.get('user')!.id,
          c.req.valid('json').channelId,
        );
        return c.json({ data: true });
      },
    )
    .post(
      '/creators/:id/youtube/import',
      zValidator('param', id),
      zValidator(
        'json',
        z.object({ channelId: z.string().regex(/^UC[\w-]{22}$/), url: z.string().max(2000) }),
      ),
      async c =>
        c.json({
          data: await youtube.importVideo(
            c.req.valid('param').id,
            c.get('user')!.id,
            c.req.valid('json').channelId,
            c.req.valid('json').url,
          ),
        }),
    )
    .put(
      '/creators/:id/youtube/settings',
      zValidator('param', id),
      zValidator('json', youtubeImportSettingsSchema),
      async c => {
        const { channelId, autoImportEnabled } = c.req.valid('json');
        await channelImports.setAutoImport(
          c.req.valid('param').id,
          c.get('user')!.id,
          channelId,
          autoImportEnabled,
        );
        return c.json({ data: true });
      },
    )
    .post(
      '/creators/:id/youtube/fetch',
      zValidator('param', id),
      zValidator('json', youtubeChannelSchema),
      async c =>
        c.json({
          data: await channelImports.fetchNew(
            c.req.valid('param').id,
            c.get('user')!.id,
            c.req.valid('json').channelId,
          ),
        }),
    )
    .get('/youtube/callback', async c => {
      const query = z
        .object({ state: z.string().min(30).max(200), code: z.string().min(1).max(4000) })
        .safeParse(c.req.query());
      if (!query.success || !c.get('user') || !c.get('session'))
        return c.redirect('/creator-studio?youtube=failed');
      try {
        const { creatorId, channelId } = await youtube.callback(
          c.get('user')!.id,
          c.get('session')!.id,
          query.data.state,
          query.data.code,
        );
        return c.redirect(
          `/creator-studio?creatorId=${creatorId}&youtube=connected&youtubeChannelId=${channelId}`,
        );
      } catch (error) {
        console.warn('YouTube connection callback failed', {
          kind: error instanceof CreatorError ? error.status : 'unexpected',
        });
        return c.redirect('/creator-studio?youtube=failed');
      }
    });
}
export const creatorHubRoute = createCreatorHubRoute();
