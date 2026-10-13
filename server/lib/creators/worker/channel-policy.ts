import { eligibleChannels } from '../channels.ts';
import type { Connection } from '../types.ts';
import { WorkerError } from './contracts.ts';
import type { Job } from './state.ts';

export async function assertChannelImportAllowed(database: Connection, job: Job) {
  const eligible = await eligibleChannels(database);
  if (eligible.channels.get(job.channelId) !== job.creatorId)
    throw new WorkerError('channel_no_longer_eligible', false);
  if (!job.manuallyRequested && eligible.paused.has(job.channelId))
    throw new WorkerError('auto_import_paused');
}
