import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { tournamentLocationService } from '../../../lib/tournaments/location.ts';
import { TournamentLocationError } from '../../../lib/tournaments/geocoding.ts';
import { SwuSet } from '../../../../types/enums.ts';
import {
  zTournamentAdditionalInfoRequest,
  zTournamentCoordinatesRequest,
} from '../../../../types/TournamentLocation.ts';

export function createTournamentLocationRouter(
  service = tournamentLocationService,
  authorize = requireAdmin,
) {
  const id = z.object({ id: z.uuid() });
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof TournamentLocationError)
        return c.json({ message: error.message }, error.status);
      throw error;
    })
    .get(
      '/bulk/coordinates',
      zValidator('query', z.object({ set: z.enum(SwuSet).optional() })),
      async c => {
        const access = await authorize(c);
        if (access.response) return access.response;
        c.header('Cache-Control', 'no-store');
        return c.json({ data: await service.list(c.req.valid('query').set) });
      },
    )
    .put(
      '/:id/additional-info',
      zValidator('param', id),
      zValidator('json', zTournamentAdditionalInfoRequest),
      async c => {
        const access = await authorize(c);
        if (access.response) return access.response;
        const { additionalInfo, expectedAdditionalInfo } = c.req.valid('json');
        return c.json({
          data: await service.save(c.req.valid('param').id, additionalInfo, expectedAdditionalInfo),
        });
      },
    )
    .post(
      '/:id/coordinates',
      zValidator('param', id),
      zValidator('json', zTournamentCoordinatesRequest),
      async c => {
        const access = await authorize(c);
        if (access.response) return access.response;
        return c.json({
          data: await service.compute(c.req.valid('param').id, c.req.valid('json').force),
        });
      },
    );
}

export const tournamentLocationRoute = createTournamentLocationRouter();
