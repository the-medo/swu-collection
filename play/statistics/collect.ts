import type { CardMetric, CardMetrics } from '../../shared/types/cardMetrics.ts';
import type { CrossfireRoundMetrics } from '../../shared/types/crossfire-statistics.ts';
import { decodeState } from '../engine/checkpoint.ts';
import type { CardReference } from '../engine/model.ts';
import { verifyHistory, type History } from '../history/records.ts';

const empty = (): CrossfireRoundMetrics => ({
  actions: 0,
  attacks: 0,
  played: 0,
  activated: 0,
  drawn: 0,
  discarded: 0,
  resourced: 0,
  playResourcesSpent: 0,
});
export type PlayerStatistics = {
  cardMetrics: CardMetrics;
  roundMetrics: Record<string, CrossfireRoundMetrics>;
  totals: CrossfireRoundMetrics;
  hasInitiative: boolean | null;
  hasMulligan: boolean | null;
};

/** Requires a verified, terminal history. Final facts contain only the surviving
 * branch; physical owners remain available after defeat/control changes. */
export function collectStatistics(source: History) {
  const cancelledFacts = new Set<number>();
  const completedActions = new Set<number>();
  const verified = verifyHistory(source, (before, after, entry) => {
    if (entry.control)
      for (const index of cancelledFacts)
        if (index >= after.facts.length) cancelledFacts.delete(index);
    // Payment cancellation restores mechanics but retains log facts for viewers.
    if (
      before.playPayment &&
      after.facts.slice(before.facts.length).some(f => f.type === 'play-cancelled')
    ) {
      const rollback = JSON.parse(before.playPayment.rollback) as { facts: unknown[] };
      for (let index = rollback.facts.length; index < after.facts.length; index++)
        cancelledFacts.add(index);
    }
    const action = entry.timeline.action;
    if (
      action &&
      (after.result ||
        after.round !== action.round ||
        after.phase !== 'action' ||
        (after.phaseHistory.actionsTaken[action.actor] ?? 0) > action.actionsTaken)
    )
      completedActions.add(action.id);
  });
  const { state, history } = verified;
  if (!state.result) throw new Error('Statistics require a completed game');
  const initial = decodeState(history.checkpoint.checkpoint);
  // Resumed positions retain rule history. Do not count the source game's facts again.
  const startingFact = initial.facts.length;
  const players: Record<string, PlayerStatistics> = Object.fromEntries(
    state.seats.map(seat => [
      seat,
      {
        cardMetrics: {},
        roundMetrics: {},
        totals: empty(),
        hasInitiative: null,
        hasMulligan: null,
      },
    ]),
  );
  // Keep undrawn deck cards in the shared "included in games" denominator.
  for (const card of Object.values(initial.cards)) {
    const player = players[card.owner];
    if (player) player.cardMetrics[card.cardId] ??= {};
  }
  let round = initial.round;
  const count = (seat: string | null | undefined, key: keyof CrossfireRoundMetrics, amount = 1) => {
    const player = seat ? players[seat] : undefined;
    if (!player) return;
    player.totals[key] += amount;
    (player.roundMetrics[String(round)] ??= empty())[key] += amount;
  };
  const card = (
    seat: string | null | undefined,
    ref: CardReference | undefined,
    key: keyof CardMetric,
  ) => {
    const player = seat ? players[seat] : undefined;
    if (!player || !ref) return;
    const metrics = (player.cardMetrics[ref.cardId] ??= {});
    metrics[key] = (metrics[key] ?? 0) + 1;
    count(seat, key);
  };
  for (const [index, fact] of state.facts.entries()) {
    if (index < startingFact || cancelledFacts.has(index)) continue;
    if (fact.type === 'round') round = fact.amount ?? round;
    if (fact.type === 'initiative' && round === 0)
      for (const seat of state.seats) players[seat]!.hasInitiative = fact.actor === seat;
    if (fact.type === 'mulligan' && fact.actor && players[fact.actor])
      players[fact.actor]!.hasMulligan = fact.amount === 1;
    // Draw/resource events have separate public counts and private identities.
    if ((fact.type === 'drawn' || fact.type === 'resourced') && fact.audience !== 'public')
      for (const ref of fact.cards) card(fact.actor, ref, fact.type);
    if (fact.type === 'played') {
      card(fact.actor, fact.cards[0], 'played');
      count(fact.actor, 'playResourcesSpent', fact.amount ?? 0);
    }
    if (fact.type === 'ability-used') card(fact.actor, fact.cards[0], 'activated');
    if (fact.type === 'attacked') count(fact.actor, 'attacks');
    // First reference is the effect source, even if it is also discarded.
    if (fact.type === 'discarded')
      for (const ref of fact.cards.slice(1))
        card(state.cards[ref.instanceId]?.owner, ref, 'discarded');
  }
  // Timeline ancestry skips abandoned continuations. Nested plays/choices count
  // as one root action; cancelled payments have no committed action fact.
  const entries = new Map(history.journal.map(entry => [entry.sequence, entry]));
  const actions = new Map<number, { actor: string; round: number }>();
  for (let sequence = history.sequence; sequence > 0; ) {
    const entry = entries.get(sequence)!;
    const action = entry.timeline.action;
    if (action && completedActions.has(action.id)) actions.set(action.id, action);
    sequence = entry.timeline.parent;
  }
  for (const action of actions.values()) {
    round = action.round;
    count(action.actor, 'actions');
  }
  return { players, state };
}
