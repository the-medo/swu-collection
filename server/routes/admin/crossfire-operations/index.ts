import postgres from 'postgres';
import { CrossfireOperations } from '../../../lib/crossfire/operations.ts';
import { createCrossfireOperationsRouter } from './router.ts';

let service: CrossfireOperations | undefined;
export const crossfireOperationsRoute = createCrossfireOperationsRouter(() => {
  if (!service) {
    if (!process.env.DATABASE_URL) throw new Error('Crossfire requires DATABASE_URL');
    service = new CrossfireOperations(
      postgres(process.env.DATABASE_URL, { max: 2, idle_timeout: 20, connect_timeout: 5 }),
    );
  }
  return service;
});
