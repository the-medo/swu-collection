import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { TrainingRuns } from '../../shared/types/crossfire-training-roster.ts';
import type { AddTrainingDeck } from '../../shared/types/crossfire-training-roster.ts';

export const runId = z
  .string()
  .regex(/^specialists-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const registrySchema = z.strictObject({
  version: z.literal(1),
  activeRun: z.union([z.literal('specialists'), runId]),
  runs: z
    .array(
      z.strictObject({
        id: runId,
        label: z.string().min(1).max(100),
        requestHash: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .max(32),
});
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
async function readRegistry(repositoryRoot: string) {
  const file = path.join(repositoryRoot, '.swubase/crossfire-ai/training-runs.json');
  let raw: unknown = { version: 1, activeRun: 'specialists', runs: [] };
  try {
    if ((await stat(file)).size > 65536) throw new Error('Invalid training registry');
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const registry = registrySchema.parse(raw);
  if (
    new Set(registry.runs.map(r => r.id)).size !== registry.runs.length ||
    (registry.activeRun !== 'specialists' && !registry.runs.some(r => r.id === registry.activeRun))
  )
    throw new Error('Invalid active training run');
  return registry;
}
export async function completedTrainingRequest(repositoryRoot: string, input: AddTrainingDeck) {
  const registry = await readRegistry(repositoryRoot);
  const id = `specialists-${input.requestId}`;
  const request = registry.runs.find(r => r.id === id);
  if (!request) return null;
  const { deckId, archetypes, contentHash, revision } = input;
  const fingerprint = createHash('sha256')
    .update(canonical({ deckId, archetypes, contentHash, revision }))
    .digest('hex');
  if (fingerprint !== request.requestHash) return { conflict: true as const };
  return { run: id, revision: createHash('sha256').update(canonical(registry)).digest('hex') };
}
export async function trainingRuns(repositoryRoot: string): Promise<TrainingRuns> {
  const registry = await readRegistry(repositoryRoot);
  return {
    activeRun: registry.activeRun,
    revision: createHash('sha256').update(canonical(registry)).digest('hex'),
    runs: [
      { id: 'specialists', label: 'Specialists · initial roster' },
      { id: 'legacy', label: 'Legacy · archived baseline' },
      ...registry.runs.map(({ id, label }) => ({ id, label })),
    ],
  };
}
export async function trainingRunDirectory(repositoryRoot: string, id: string) {
  const registry = await trainingRuns(repositoryRoot);
  if (!registry.runs.some(r => r.id === id)) return null;
  const root = path.join(repositoryRoot, '.swubase/crossfire-ai');
  const dir = path.join(
    root,
    id === 'legacy' ? 'league-run-01' : id === 'specialists' ? 'specialists-run-01' : id,
  );
  try {
    const [realRoot, realDir] = await Promise.all([realpath(root), realpath(dir)]);
    if (!realDir.startsWith(realRoot + path.sep))
      throw new Error('Training run escapes artifact root');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return dir;
}
