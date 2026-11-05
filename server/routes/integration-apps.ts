import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import {
  integrationAppSchema,
  integrationAuthorizeSchema,
  integrationGameResultSchema,
  integrationTokenSchema,
} from '../../shared/types/integrationApp.ts';
import { IntegrationAppError, integrationAppService } from '../lib/integration-apps/service.ts';
import { hashIntegrationSecret } from '../lib/integration-apps/crypto.ts';
import { createIntegrationRateLimiter } from '../lib/integration-apps/rateLimit.ts';

const clientParam = z.object({ clientId: z.string().min(1).max(100) });
export function createIntegrationAppsRoute(service = integrationAppService) {
  const limit = createIntegrationRateLimiter();
  // Charge resources to the authenticated app/player, not a rotating token or
  // a public client ID. Token exchanges have a separate allowance.
  const limitResource = (key: string) => limit(`resource:${key}`);
  const bearer = (header: string | undefined) => {
    const match = header?.match(/^Bearer (swu_access_[A-Za-z0-9_-]{43})$/i);
    if (!match) throw new IntegrationAppError('A bearer access token is required.', 401);
    limit(`bearer:${hashIntegrationSecret(match[1]!)}`);
    return match[1]!;
  };
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof IntegrationAppError) {
        if (error.status === 429) c.header('Retry-After', '60');
        return c.json({ message: error.message }, error.status);
      }
      // DB error parameters can include hashes or confidential authorization
      // requests. Never propagate them into the global request/error logger.
      console.warn('Integration app request failed.');
      return c.json({ message: 'Integration app request failed.' }, 500);
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      c.header('Referrer-Policy', 'no-referrer');
      await next();
    })
    .use(
      '*',
      bodyLimit({ maxSize: 16_384, onError: c => c.json({ message: 'Request too large.' }, 413) }),
    )
    .post(
      '/token',
      zValidator('json', integrationTokenSchema, (result, c) => {
        if (!result.success) return c.json({ message: 'Invalid token request.' }, 400);
      }),
      async c => {
        const input = c.req.valid('json');
        // Client IDs are public. Only the submitted high-entropy credential can
        // consume its bucket; knowing an app ID cannot block its real users.
        const grantCredential =
          input.grant_type === 'authorization_code' ? input.code : input.refresh_token;
        limit(
          `exchange:${hashIntegrationSecret(JSON.stringify([input.client_id, input.client_secret, grantCredential]))}`,
        );
        return c.json(await service.exchange(input, key => limit(`connection:${key}`)));
      },
    )
    .get('/me', async c =>
      c.json({ data: await service.profile(bearer(c.req.header('Authorization')), limitResource) }),
    )
    .post('/game-results', zValidator('json', integrationGameResultSchema), async c =>
      c.json({
        data: await service.submitGame(
          bearer(c.req.header('Authorization')),
          c.req.valid('json'),
          limitResource,
        ),
      }),
    )
    .use('*', async (c, next) => {
      const account = c.get('user');
      if (!account) return c.json({ message: 'Unauthorized' }, 401);
      if (!['GET', 'HEAD'].includes(c.req.method)) {
        if (c.req.header('X-Requested-With') !== 'swubase')
          return c.json({ message: 'Invalid request origin.' }, 403);
        limit(`user:${account.id}`);
      }
      await next();
    })
    .get('/apps', async c => c.json({ data: await service.list(c.get('user')!.id) }))
    .post('/apps', zValidator('json', integrationAppSchema), async c =>
      c.json({ data: await service.create(c.get('user')!.id, c.req.valid('json')) }, 201),
    )
    .put(
      '/apps/:clientId',
      zValidator('param', clientParam),
      zValidator('json', integrationAppSchema),
      async c =>
        c.json({
          data: await service.update(
            c.get('user')!.id,
            c.req.valid('param').clientId,
            c.req.valid('json'),
          ),
        }),
    )
    .post('/apps/:clientId/rotate-secret', zValidator('param', clientParam), async c =>
      c.json({ data: await service.rotate(c.get('user')!.id, c.req.valid('param').clientId) }),
    )
    .put(
      '/apps/:clientId/status',
      zValidator('param', clientParam),
      zValidator('json', z.object({ disabled: z.boolean() })),
      async c =>
        c.json({
          data: await service.setDisabled(
            c.get('user')!.id,
            c.req.valid('param').clientId,
            c.req.valid('json').disabled,
          ),
        }),
    )
    .delete('/apps/:clientId', zValidator('param', clientParam), async c => {
      await service.remove(c.get('user')!.id, c.req.valid('param').clientId);
      return c.json({ success: true });
    })
    .get('/connections', async c => c.json({ data: await service.connections(c.get('user')!.id) }))
    .delete('/connections/:clientId', zValidator('param', clientParam), async c => {
      await service.disconnect(c.get('user')!.id, c.req.valid('param').clientId);
      return c.json({ success: true });
    })
    .get('/authorize', zValidator('query', integrationAuthorizeSchema), async c =>
      c.json({ data: await service.authorization(c.req.valid('query')) }),
    )
    .post(
      '/authorize',
      zValidator('json', integrationAuthorizeSchema.extend({ accept: z.boolean() })),
      async c =>
        c.json({
          data: await service.consent(
            c.get('user')!.id,
            c.req.valid('json'),
            c.req.valid('json').accept,
          ),
        }),
    );
}

export const integrationAppsRoute = createIntegrationAppsRoute();
