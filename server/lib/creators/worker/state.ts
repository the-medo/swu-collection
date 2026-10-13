import { and, eq } from 'drizzle-orm';
import { creatorVideoJob as jobs } from '../../../db/schema/creator_video_job.ts';
export { now } from '../types.ts';
export type Job = typeof jobs.$inferSelect;
export const lease = () => new Date(Date.now() + 15 * 60_000).toISOString();
export const ownedClaim = (job: Job) =>
  and(eq(jobs.videoId, job.videoId), eq(jobs.claimId, job.claimId!), eq(jobs.status, 'processing'));
