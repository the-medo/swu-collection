import postgres from 'postgres';
import { CrossfireCardReleases } from '../../../lib/crossfire/cardReleases.ts';
import { configuredReleaseObjects } from '../../../../play/releases/storage.ts';
import { createCardReleaseRouter } from './router.ts';
let service: CrossfireCardReleases | undefined;
export const crossfireCardReleasesRoute = createCardReleaseRouter(() => {
  if (!service) {
    if (!process.env.DATABASE_URL) throw new Error('Crossfire requires DATABASE_URL');
    service = new CrossfireCardReleases(
      postgres(process.env.DATABASE_URL, { max: 2, idle_timeout: 20, connect_timeout: 5 }),
      configuredReleaseObjects(),
    );
  }
  return service;
});
