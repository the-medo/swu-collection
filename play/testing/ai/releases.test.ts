import { expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import {
  publishRelease,
  readRelease,
  readWeights,
  releaseIndex,
  sha256,
} from '../../ai/releases/objects.ts';
import {
  publishDataset,
  revokeDataset,
  datasetIndex,
  datasetKey,
} from '../../ai/datasets/objects.ts';
import { eligible } from '../../../server/lib/crossfire/aiReleases.ts';
import { versions } from '../../engine/model.ts';
import { aiReleaseSchema } from '../../../shared/types/crossfire-ai-releases.ts';
import { MemoryAiObjects, releaseFixture } from './release-fixtures.ts';

test('release publication is immutable, hash checked, idempotent and survives competing index writes', async () => {
  const objects = new MemoryAiObjects();
  const a = releaseFixture(),
    b = releaseFixture();
  const [first, second] = await Promise.all([
    publishRelease(objects, a.release, a.weights),
    publishRelease(objects, b.release, b.weights),
  ]);
  expect((await releaseIndex(objects)).releases).toHaveLength(2);
  expect(await publishRelease(objects, a.release, a.weights)).toEqual(first);
  expect(await readRelease(objects, second)).toEqual(b.release);
  expect(await readWeights(objects, a.release)).toEqual(a.weights);
  await expect(
    publishRelease(objects, { ...a.release, label: 'mutated' }, a.weights),
  ).rejects.toThrow('overwritten');
  await expect(publishRelease(objects, a.release, Buffer.from('wrong'))).rejects.toThrow(
    'integrity',
  );
  expect(eligible(a.release, versions)).toBe(true);
  expect(eligible(a.release, { ...versions, engine: '99.0.0' })).toBe(false);
  expect(eligible({ ...a.release, updates: 0 }, versions)).toBe(false);
  const invalid = structuredClone(a.release);
  invalid.evaluations[0]!.modelHash = 'f'.repeat(64);
  expect(() => aiReleaseSchema.parse(invalid)).toThrow();
});

test('dataset revocation is durable and rejects republishing withdrawn games', async () => {
  const objects = new MemoryAiObjects(),
    bytes = Buffer.from('private fixture'),
    id = randomUUID();
  const entry = {
    id,
    checksum: sha256(bytes),
    groupId: 'a'.repeat(64),
    state: 'available' as const,
    createdAt: '2026-09-24T00:00:00.000Z',
    expiresAt: '2026-12-23T00:00:00.000Z',
  };
  await publishDataset(objects, entry, bytes);
  await revokeDataset(objects, entry);
  await revokeDataset(objects, entry);
  expect((await datasetIndex(objects, id.slice(0, 2))).entries[0]!.state).toBe('revoked');
  expect(await objects.read(datasetKey(id, entry.checksum))).toBeNull();
  await expect(publishDataset(objects, entry, bytes)).rejects.toThrow('republished');
  // A failed stale publisher must not leave a newly recreated private blob.
  expect(await objects.read(datasetKey(id, entry.checksum))).toBeNull();
});
