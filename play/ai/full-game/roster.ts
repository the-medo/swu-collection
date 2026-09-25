import data from './decks.json';
import leagueData from './league-decks.json';
import { decodeDeckSnapshot } from '../../admission/decks.ts';
import { versions } from '../../engine/model.ts';
import { isDeepStrictEqual } from 'node:util';

const decode = ({ key, snapshot }: (typeof data.decks)[number]) => {
  if (!isDeepStrictEqual(snapshot.versions, versions))
    throw new Error('Training decks require their original engine/card versions');
  const identities = Object.fromEntries(
    snapshot.cardIdentities.map(c => [c.cardId, { type: c.type }]),
  );
  return { key, snapshot: decodeDeckSnapshot(snapshot, identities) };
};

// Preserve the original two-deck contract for existing checkpoints and probes.
export const roster = data.decks.map(decode);
export const leagueRoster = leagueData.decks.map(decode);
