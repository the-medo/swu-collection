import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import type { tournamentReportService } from '../lib/melee/tournamentReport.ts';
import { MeleeConnectionError } from '../lib/melee/profile.ts';

export function createUserTournamentReportRouter(service: typeof tournamentReportService) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof MeleeConnectionError)
        return c.json({ message: error.message }, error.status);
      throw error;
    })
    .get(
      '/:id/tournaments/:tournamentId/report',
      zValidator(
        'param',
        z.object({
          id: z.string().min(1).max(200),
          tournamentId: z.uuid(),
        }),
      ),
      async c => {
        c.header('Cache-Control', 'private, no-store');
        const user = c.get('user');
        if (!user) return c.json({ message: 'Sign in to create a tournament report.' }, 401);
        const params = c.req.valid('param');
        if (params.id !== user.id)
          return c.json({ message: 'Choose a tournament from your own Melee history.' }, 403);
        return c.json({ data: await service.get(user.id, params.tournamentId) });
      },
    );
}
