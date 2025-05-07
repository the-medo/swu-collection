import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zMetaCreateRequest } from '../../../types/ZMeta.ts';
import { db } from '../../db';
import { meta as metaTable } from '../../db/schema/meta.ts';

export const metaPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zMetaCreateRequest),
  async c => {
    const user = c.get('user');
    const data = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          meta: ['create'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          message: "You don't have permission to create a meta entry.",
        },
        403,
      );
    }

    const newMeta = await db
      .insert(metaTable)
      .values({
        ...data,
      })
      .returning();

    return c.json({ data: newMeta[0] }, 201);
  },
);