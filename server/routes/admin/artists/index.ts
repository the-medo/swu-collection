import { db } from '../../../db';
import { ArtistTransferAdmin } from '../../../lib/artists/admin.ts';
import { createArtistSnapshotStorage } from '../../../lib/artists/storage.ts';
import { createArtistTransferRouter } from './router.ts';

export const artistTransferAdminRoute = createArtistTransferRouter(
  new ArtistTransferAdmin(db, createArtistSnapshotStorage()),
);
