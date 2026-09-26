import initial from '../../ai/full-game/league-decks.json';
import specialists from '../../ai/specialists/roster.json';
import { prepareDeckSnapshot } from '../../admission/decks.ts';
import { bundledCatalog } from '../../cards/catalog.ts';
import { versions } from '../../engine/model.ts';

export function rosterFixtures() {
  const leaders = specialists.leaders.map(({ key, label, cardId }) => ({ key, label, cardId }));
  const decks = initial.decks.map((d, i) => ({
    ...d,
    leaderKey: leaders[i]!.key,
    strategies: specialists.leaders[i]!.strategies,
  }));
  const old = decks[0]!.snapshot;
  const catalog = Object.fromEntries(
    bundledCatalog.data.cards.map(c => [
      c.cardId,
      { type: c.kind[0]!.toUpperCase() + c.kind.slice(1) },
    ]),
  );
  const used = new Set(initial.decks.flatMap(d => d.snapshot.mainboard.map(c => c.cardId)));
  const added = bundledCatalog.data.cards.find(
    c => c.kind === 'unit' && !c.token && !used.has(c.cardId),
  )!.cardId;
  const input = {
    source: {
      deckId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      format: old.sourceFormat,
      kind: 'normal',
    },
    leader: 'count-dooku--face-of-the-confederacy',
    leader2: null,
    base: old.base,
    mainboard: [...old.mainboard, { cardId: added, quantity: 1 }],
    sideboard: [],
    reserve: [],
  };
  const fresh = prepareDeckSnapshot(input, catalog, versions.format);
  const same = prepareDeckSnapshot(
    {
      ...input,
      source: { ...input.source, deckId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      leader: old.leader,
    },
    catalog,
    versions.format,
  );
  if (!fresh.ok || !same.ok) throw new Error('Invalid fixture deck');
  return {
    seven: {
      version: 1,
      leaders: [...leaders, { key: 'dooku', label: 'Count Dooku', cardId: input.leader }],
      decks: [
        ...decks,
        {
          key: 'dooku-test',
          label: 'Dooku test',
          leaderKey: 'dooku',
          strategies: ['control'],
          snapshot: fresh.snapshot,
        },
      ],
    },
    eight: {
      version: 1,
      leaders: [...leaders, { key: 'dooku', label: 'Count Dooku', cardId: input.leader }],
      decks: [
        ...decks,
        {
          key: 'dooku-test',
          label: 'Dooku test',
          leaderKey: 'dooku',
          strategies: ['control'],
          snapshot: fresh.snapshot,
        },
        {
          key: 'greef-control',
          label: 'Greef control test',
          leaderKey: 'greef',
          strategies: ['control'],
          snapshot: same.snapshot,
        },
      ],
    },
    added,
  };
}
if (import.meta.main) console.log(JSON.stringify(rosterFixtures()));
