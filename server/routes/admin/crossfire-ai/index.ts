import postgres from 'postgres';
import { CrossfireAiReleases } from '../../../lib/crossfire/aiReleases.ts';
import { configuredAiObjects } from '../../../../play/ai/releases/objects.ts';
import { configuredAiInference } from '../../../../play/ai/releases/inference.ts';
import { createAiReleaseRouter } from './router.ts';
let service: CrossfireAiReleases | undefined;
export const crossfireAiRoute = createAiReleaseRouter(() => {
  if (!service) {
    if (!process.env.DATABASE_URL) throw new Error('Crossfire requires DATABASE_URL');
    service = new CrossfireAiReleases(
      postgres(process.env.DATABASE_URL, { max: 2, idle_timeout: 20, connect_timeout: 5 }),
      configuredAiObjects(),
      configuredAiInference(),
    );
  }
  return service;
});
