import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { SwuSet } from '../../../../types/enums.ts';
import {
  ChecklistStorageUnavailable,
  generateSetChecklists,
} from '../../../lib/sets/checklists/generateSetChecklists.ts';

export const setChecklistsRoute = new Hono().get(
  '/:set/checklists',
  zValidator('param', z.object({ set: z.enum(SwuSet) })),
  async c => {
    try {
      // A cold set can wait for another set's render or a slow R2 upload.
      // Let the dialog poll the same job before the HTTP connection idles out.
      const data = await Promise.race([
        generateSetChecklists(c.req.valid('param').set),
        Bun.sleep(1_500).then(() => null),
      ]);
      if (data === null) {
        c.header('Cache-Control', 'no-store');
        return c.json({ data: null }, 202);
      }
      return c.json({ data });
    } catch (error) {
      if (error instanceof ChecklistStorageUnavailable)
        return c.json({ message: 'Checklist storage is unavailable.' }, 503);
      throw error;
    }
  },
);
