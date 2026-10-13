import { db } from '../../../db/index.ts';
import type { Database } from '../types.ts';
import { createQueueStore } from './queue.ts';
import { createSpendingStore } from './spending.ts';
import { createPublicationStore } from './publication.ts';
import { createReportStore } from './report.ts';
export type { Database, Transaction } from '../types.ts';
export type { Job } from './state.ts';
export {
  directoryChannelIds,
  directoryHandle,
  eligibleChannels,
  refreshDirectoryHandles,
} from '../channels.ts';

export function createWorkerStore(database: Database = db) {
  return {
    database,
    ...createQueueStore(database),
    ...createSpendingStore(database),
    ...createPublicationStore(database),
    ...createReportStore(database),
  };
}
