import { randomUUID } from 'node:crypto';
import { versions } from '../../engine/model.ts';
import type { AiObjects } from '../../ai/releases/objects.ts';
import { sha256 } from '../../ai/releases/objects.ts';
import { aiReleaseSchema } from '../../../shared/types/crossfire-ai-releases.ts';
export class MemoryAiObjects implements AiObjects {
  files = new Map<string, { bytes: Buffer; etag: string }>();
  revision = 0;
  async read(key: string) {
    return this.files.get(key) ?? null;
  }
  async write(key: string, bytes: Uint8Array, condition: { create?: boolean; etag?: string }) {
    const old = this.files.get(key);
    if (condition.create ? !!old : old?.etag !== condition.etag)
      throw new Error('Precondition failed');
    this.files.set(key, { bytes: Buffer.from(bytes), etag: String(++this.revision) });
  }
  async remove(key: string) {
    this.files.delete(key);
  }
}
export function releaseFixture(leader = `test-${randomUUID()}`) {
  const weights = Buffer.from('fixture weights');
  const hash = sha256(weights);
  const release = aiReleaseSchema.parse({
    schema: 1,
    id: randomUUID(),
    label: 'Fixture',
    createdAt: new Date().toISOString(),
    sourceCommit: 'a'.repeat(40),
    leader: { key: 'krennic', cardId: leader, label: 'Krennic fixture' },
    artifact: { sha256: hash, bytes: weights.length },
    architecture: 'crossfire-specialists-v1',
    interfaceHash: 'b'.repeat(64),
    contract: { decimals: [0.1, 1.5, 1e-100, 1e100, 9007199254740991] },
    games: 100_000,
    updates: 100,
    decks: [{ key: 'krennic', label: 'Ramp', hash: 'c'.repeat(64), archetypes: ['ramp'] }],
    evaluations: [
      {
        suite: 'crossfire-ai-release-v1',
        versions,
        interfaceHash: 'b'.repeat(64),
        seed: 100,
        modelHash: hash,
        opponentHash: hash,
        games: 40,
        wins: 20,
        losses: 18,
        draws: 2,
        cutoffs: 0,
        replayChecked: 40,
        decisions: 1000,
        byOpponent: [{ deck: 'vader', games: 40, wins: 20, losses: 18, draws: 2 }],
        byDeck: [{ deck: 'krennic', games: 40 }],
      },
    ],
  });
  return { release, weights };
}
