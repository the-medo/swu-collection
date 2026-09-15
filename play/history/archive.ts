import { createHash } from 'node:crypto';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { z } from 'zod';
import { bundleVersionsSchema } from '../host/bundles.ts';
import { summarySchema, verifyHistory } from './records.ts';
import type { History } from './records.ts';
import { timelineSchema, undoControlSchema } from './timeline.ts';

const MAX_RAW = 64 * 1024 * 1024,
  MAX_COMPRESSED = 8 * 1024 * 1024;
const count = z.number().int().min(0).max(2_147_483_647);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const id = z.string().min(1).max(128);
const payloadSchema = z.strictObject({
  format: z.literal(1),
  gameId: id,
  versions: bundleVersionsSchema,
  sequence: count,
  revision: count,
  stateHash: hash,
  checkpoint: z.strictObject({
    sequence: z.literal(0),
    revision: count,
    stateHash: hash,
    checkpoint: z.string().max(8_388_608),
  }),
  journal: z
    .array(
      z.strictObject({
        sequence: count.positive(),
        revision: count,
        requestHash: hash,
        actorId: id,
        commandId: id,
        fromRevision: count,
        stateHash: hash,
        inputs: z.array(z.json()).max(100_000),
        facts: z.array(z.json()).max(100_000),
        timeline: timelineSchema,
        control: undoControlSchema.optional(),
      }),
    )
    .max(10_000),
  summary: summarySchema,
});
export type Archive = {
  format: 1;
  sequence: number;
  stateHash: string;
  payloadHash: string;
  rawBytes: number;
  payload: Buffer;
};
const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex');

/** Call from bounded background execution: verification executes the engine. */
export async function encodeArchive(source: History): Promise<Archive> {
  const { history, state } = verifyHistory(source);
  if (!state.result || !source.summary)
    throw new Error('Crossfire archive requires a completed game');
  const raw = Buffer.from(JSON.stringify(payloadSchema.parse({ format: 1, ...history })));
  if (raw.length > MAX_RAW) throw new Error('Crossfire archive capacity');
  const payload = await promisify(gzip)(raw, { level: 6 });
  if (payload.length > MAX_COMPRESSED) throw new Error('Crossfire archive capacity');
  return {
    format: 1,
    sequence: history.sequence,
    stateHash: history.stateHash,
    payloadHash: digest(payload),
    rawBytes: raw.length,
    payload,
  };
}

/** Bounded decompression plus envelope validation. Consumers reconstruct states
 * with integrity verification before exposing any permitted projection. */
export async function decodeArchive(archive: Archive): Promise<History> {
  if (
    archive.format !== 1 ||
    archive.rawBytes <= 0 ||
    archive.rawBytes > MAX_RAW ||
    archive.payload.length > MAX_COMPRESSED ||
    digest(archive.payload) !== archive.payloadHash
  )
    throw new Error('Crossfire archive integrity mismatch');
  const raw = await promisify(gunzip)(archive.payload, { maxOutputLength: MAX_RAW });
  if (raw.length !== archive.rawBytes) throw new Error('Crossfire archive integrity mismatch');
  const { format: _, ...history } = payloadSchema.parse(JSON.parse(raw.toString('utf8')));
  if (history.sequence !== archive.sequence || history.stateHash !== archive.stateHash)
    throw new Error('Crossfire archive integrity mismatch');
  return history;
}
