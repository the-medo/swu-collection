import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import runDailySnapshot from '../../../../lib/daily-snapshots/daily-snapshot-main.ts';

// POST /admin/special-actions/daily-snapshot
// Body: { date?: string } where date is in YYYY-MM-DD (optional)
// Only accessible by admins
export const dailySnapshotPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  const hasPermission = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permission: {
        admin: ['access'],
      },
    },
  });

  if (!hasPermission.success) {
    return c.json({ message: "You don't have permission to trigger daily snapshot." }, 403);
  }

  try {
    const body = await c.req.json().catch(() => ({} as any));
    const dateInput: unknown = body?.date;

    let date: Date | string | undefined = undefined;
    if (typeof dateInput === 'string' && dateInput.trim().length > 0) {
      // Accept YYYY-MM-DD or ISO string; invalid strings are ignored and treated as today
      const d = new Date(dateInput);
      if (!isNaN(d.getTime())) {
        date = d;
      }
    }

    const result = await runDailySnapshot(date);

    return c.json(
      {
        message: 'Daily snapshot run completed',
        data: {
          date: result.date,
          tournamentGroupId: result.tournamentGroupId,
          sections: result.sections.map(s => ({ name: s.name, ok: s.ok, error: s.error })),
        },
      },
      200,
    );
  } catch (error) {
    console.error('[daily-snapshot endpoint] Error:', error);
    return c.json(
      {
        message: 'Failed to run daily snapshot',
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
