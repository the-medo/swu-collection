import data from '../../ai/full-game/eight-decks.json';
import { decodeTrainingRoster } from '../../ai/full-game/training-roster.ts';
import { rosterEnvironment } from '../../ai/full-game/game.ts';
import { canonicalJson } from '../../cards/catalog.ts';
import { sha256 } from '../../ai/releases/objects.ts';
import { releaseFixture } from './release-fixtures.ts';
import { aiReleaseSchema } from '../../../shared/types/crossfire-ai-releases.ts';

export function playableFixture() {
  const environment = rosterEnvironment(decodeTrainingRoster(data));
  const d = environment.roster.decks.find(d => d.key === 'krennic')!;
  const fixture = releaseFixture(d.snapshot.leader);
  const contract = environment.contract;
  const interfaceHash = sha256(
    canonicalJson(
      Object.fromEntries(
        ['protocol', 'commandAdapter', 'encoding', 'specialists'].map(k => [
          k,
          contract[k as keyof typeof contract] ?? null,
        ]),
      ),
    ),
  );
  const release = aiReleaseSchema.parse({
    ...fixture.release,
    architecture: 'crossfire-specialists-v2',
    contract,
    interfaceHash,
    decks: [{ key: d.key, label: d.label, hash: d.snapshot.contentHash, archetypes: d.strategies }],
    deckSnapshots: { [d.key]: d.snapshot },
    evaluations: fixture.release.evaluations.map(e => ({ ...e, interfaceHash })),
  });
  return { release, weights: fixture.weights, environment };
}
