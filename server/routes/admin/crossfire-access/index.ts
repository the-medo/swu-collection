import postgres from 'postgres';
import { CrossfireAccess } from '../../../lib/crossfire/access.ts';
import { createCrossfireAccessRouter } from './router.ts';
let service: CrossfireAccess | undefined;
export const crossfireAccessRoute = createCrossfireAccessRouter(() => {
  if (!service) {
    if (!process.env.DATABASE_URL) throw new Error('Crossfire requires DATABASE_URL');
    service = new CrossfireAccess(
      postgres(process.env.DATABASE_URL, { max: 2, idle_timeout: 20, connect_timeout: 5 }),
    );
  }
  return service;
}, process.env.BETTER_AUTH_URL);
