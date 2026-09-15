import targets from '../testing/fixtures/meta-targets.json';
import { supportedCards } from '../cards/registry.ts';
const implemented = new Set(supportedCards.map(card => card.cardId));
const top = targets.ranking.map(row => row.cardId);
const deckCards = (deck: (typeof targets.winners)[number]) =>
  [deck.leader, deck.secondLeader, deck.base, ...deck.cards.map(card => card.cardId)].filter(
    (id): id is string => !!id,
  );
const all = new Set([...top, ...targets.top8.flatMap(deckCards)]);
const deckReport = (deck: (typeof targets.winners)[number]) => ({
  deckId: deck.deckId,
  tournament: deck.name,
  date: deck.date,
  source: `https://swubase.com/tournaments/${deck.tournamentId}`,
  completeList: !!deck.leader && !!deck.base && deck.cards.some(card => card.board === 1),
  unsupported: [...new Set(deckCards(deck).filter(id => !implemented.has(id)))],
});
const winnerDecks = targets.winners.map(deckReport);
const top8Decks = targets.top8.map(deck => ({ ...deckReport(deck), placement: deck.placement }));
const missingTop8Results = targets.tournaments.flatMap(t => {
  const expected = Math.min(8, t.attendance > 0 ? t.attendance : 8);
  const imported = targets.top8.filter(d => d.tournamentId === t.id);
  const missingPlacements = Array.from({ length: expected }, (_, i) => i + 1).filter(
    placement => !imported.some(d => d.placement === placement),
  );
  return !t.imported || missingPlacements.length
    ? [{ id: t.id, name: t.name, date: t.date, imported: t.imported, missingPlacements }]
    : [];
});
const report = {
  asOf: targets.asOf,
  top200: { implemented: top.filter(id => implemented.has(id)).length, total: top.length },
  union: { implemented: [...all].filter(id => implemented.has(id)).length, total: all.size },
  winnerDecksReady: winnerDecks.filter(deck => deck.completeList && !deck.unsupported.length)
    .length,
  winnerDecksTotal: winnerDecks.length,
  top8DecksReady: top8Decks.filter(deck => deck.completeList && !deck.unsupported.length).length,
  top8DecksTotal: top8Decks.length,
  missingTop8Results,
  top8Decks,
  missingResults: targets.tournaments.filter(t => !t.imported || t.winners !== 1),
  winnerDecks,
  unsupported: [...all].filter(id => !implemented.has(id)),
};
console.log(JSON.stringify(report, null, 2));
if (
  process.argv.includes('--require-complete') &&
  (report.unsupported.length ||
    top8Decks.some(deck => !deck.completeList || deck.unsupported.length) ||
    report.missingResults.length ||
    report.missingTop8Results.length)
)
  process.exitCode = 1;
