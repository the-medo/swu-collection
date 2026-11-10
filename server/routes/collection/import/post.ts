import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import {
  collectionImportMaxBytes,
  zCollectionCsvImportRequest,
} from '../../../../types/CollectionImport.ts';
import {
  CollectionImportError,
  importCollectionCsv,
} from '../../../lib/collections/importCollectionCsv.ts';
import { CollectionCsvError } from '../../../lib/collections/parseCollectionCsv.ts';

export const collectionCsvImportPostRoute = new Hono<AuthExtension>().post(
  '/',
  bodyLimit({
    maxSize: collectionImportMaxBytes * 3,
    onError: c => c.json({ message: 'The CSV is too large (maximum 2 MiB).' }, 413),
  }),
  zValidator('json', zCollectionCsvImportRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const input = c.req.valid('json');
    if (Buffer.byteLength(input.csv, 'utf8') > collectionImportMaxBytes)
      return c.json({ message: 'The CSV is too large (maximum 2 MiB).' }, 413);
    try {
      const data = await importCollectionCsv(user.id, input);
      return c.json({ data }, 201);
    } catch (error) {
      if (error instanceof CollectionCsvError) return c.json({ message: error.message }, 400);
      if (error instanceof CollectionImportError)
        return c.json({ message: error.message }, error.status);
      throw error;
    }
  },
);
