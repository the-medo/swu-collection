import { z } from 'zod';
import { aiHash } from '../../../shared/types/crossfire-ai-releases.ts';
import { AI_PREFIX, type AiObjects, immutable, sha256 } from '../releases/objects.ts';
import { canonicalJson } from '../../cards/catalog.ts';
export const entrySchema = z.strictObject({
  id: z.uuid(),
  groupId: aiHash,
  checksum: aiHash.nullable(),
  state: z.enum(['available', 'revoked']),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});
export type DatasetEntry = z.infer<typeof entrySchema>;
const indexSchema = z.strictObject({
  schema: z.literal(1),
  entries: z.array(entrySchema).max(40_000),
});
export const datasetKey = (id: string, hash: string) =>
  `${AI_PREFIX}/datasets/games/${z.uuid().parse(id)}/${aiHash.parse(hash)}.json.gz`;
export const shardKey = (shard: string) => {
  if (!/^[a-f0-9]{2}$/.test(shard)) throw new Error('Invalid dataset shard');
  return `${AI_PREFIX}/datasets/index/${shard}.json`;
};
export async function datasetIndex(objects: AiObjects, shard: string) {
  const object = await objects.read(shardKey(shard));
  const index = indexSchema.parse(
    object ? JSON.parse(object.bytes.toString()) : { schema: 1, entries: [] },
  );
  if (
    new Set(index.entries.map(e => e.id)).size !== index.entries.length ||
    index.entries.some(e => !e.id.startsWith(shard))
  )
    throw new Error('Invalid dataset index identities');
  return { ...index, etag: object?.etag };
}
async function update(objects: AiObjects, entry: DatasetEntry) {
  entrySchema.parse(entry);
  const shard = entry.id.slice(0, 2);
  for (let i = 0; i < 5; i++) {
    const current = await datasetIndex(objects, shard);
    const old = current.entries.find(e => e.id === entry.id);
    if (old?.state === 'revoked' && entry.state !== 'revoked')
      throw new Error('Revoked games cannot be republished');
    if (
      old &&
      (old.groupId !== entry.groupId ||
        old.createdAt !== entry.createdAt ||
        old.expiresAt !== entry.expiresAt ||
        (old.checksum && old.checksum !== entry.checksum))
    )
      throw new Error('Immutable dataset conflict');
    const next = indexSchema.parse({
      schema: 1,
      entries: [...current.entries.filter(e => e.id !== entry.id), entry],
    });
    try {
      await objects.write(
        shardKey(shard),
        Buffer.from(canonicalJson(next)),
        current.etag ? { etag: current.etag } : { create: true },
      );
      return;
    } catch (error) {
      if (i === 4) throw error;
    }
  }
}
export async function publishDataset(objects: AiObjects, entry: DatasetEntry, bytes: Buffer) {
  if (entry.state !== 'available' || sha256(bytes) !== entry.checksum)
    throw new Error('Invalid dataset publication');
  if (
    (await datasetIndex(objects, entry.id.slice(0, 2))).entries.some(
      e => e.id === entry.id && e.state === 'revoked',
    )
  )
    throw new Error('Revoked games cannot be republished');
  await immutable(objects, datasetKey(entry.id, entry.checksum!), bytes);
  try {
    await update(objects, entry);
  } catch (error) {
    if (
      (await datasetIndex(objects, entry.id.slice(0, 2))).entries.some(
        e => e.id === entry.id && e.state === 'revoked',
      )
    )
      await objects.remove(datasetKey(entry.id, entry.checksum!));
    throw error;
  }
}
export async function revokeDataset(objects: AiObjects, entry: DatasetEntry) {
  // Publish the tombstone before deleting data: importers stop using cached copies.
  await update(objects, { ...entry, state: 'revoked' });
  if (entry.checksum) await objects.remove(datasetKey(entry.id, entry.checksum));
}
