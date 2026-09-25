import { readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { trainingRosterSchema } from '../../../shared/types/crossfire-training-roster.ts';
import { trainingStrategies } from '../../../shared/types/crossfire-training.ts';
import { decodeDeckSnapshot } from '../../admission/decks.ts';
import { versions } from '../../engine/model.ts';

export function decodeTrainingRoster(raw: unknown) {
  const roster = trainingRosterSchema.parse(raw);
  const decks = roster.decks.map(d => {
    const snapshot = decodeDeckSnapshot(d.snapshot, {});
    const leader = roster.leaders.find(l => l.key === d.leaderKey)!;
    if (!isDeepStrictEqual(snapshot.versions, versions) || snapshot.leader !== leader.cardId)
      throw new Error('Training roster requires matching engine versions and leader identities');
    return { ...d, snapshot };
  });
  return { ...roster, decks };
}
export type TrainingRoster = ReturnType<typeof decodeTrainingRoster>;
export function readTrainingRoster(file: string) {
  const root = realpathSync(path.resolve(import.meta.dir, '../../../.swubase/crossfire-ai'));
  const target = realpathSync(file);
  if (!target.startsWith(root + path.sep) || statSync(target).size > 2 * 1024 * 1024)
    throw new Error('Roster must be a bounded local training artifact');
  return decodeTrainingRoster(JSON.parse(readFileSync(target, 'utf8')));
}
export function specialistRouting(roster: TrainingRoster) {
  return {
    version: 2,
    strategies: trainingStrategies,
    leaders: roster.leaders,
    decks: roster.decks.map(d => ({
      key: d.key,
      label: d.label,
      leaderKey: d.leaderKey,
      strategies: d.strategies,
    })),
  };
}
