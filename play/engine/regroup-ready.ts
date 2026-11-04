import { isUnit } from './attachments.ts';
import { cannotReady } from './lasting.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { abilitySources } from './triggers.ts';
import { instance, reference } from './state.ts';
import type { Frame, GameState } from './model.ts';

type Choice = Extract<Frame, { kind: 'regroup-ready' }>;
type Ready = Extract<Frame, { kind: 'ready' | 'ready-cards' }>;
export function regroupRestriction(state: GameState, playerId: string) {
  if (state.phase !== 'regroup') return;
  return abilitySources(state)
    .filter(c => c.controller !== playerId)
    .map(source => ({ source, limit: effectiveAbilities(state, source).enemyRegroupReadyLimit }))
    .filter(r => r.limit !== undefined && r.limit !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.limit! - b.limit!)[0];
}
export function remainingRegroupReadies(
  state: GameState,
  playerId: string,
  arena: 'ground' | 'space',
) {
  const limit = regroupRestriction(state, playerId)?.limit;
  if (limit === undefined) return Number.MAX_SAFE_INTEGER;
  return Math.max(
    0,
    limit -
      (state.phaseHistory.regroupReadied ?? []).filter(
        c => c.playerId === playerId && c.arena === arena,
      ).length,
  );
}
export function prepareRegroupReady(state: GameState, frame: Ready): boolean {
  if (frame.excluded) return false;
  const choices: Choice[] = [];
  const players =
    frame.kind === 'ready-cards'
      ? [frame.playerId]
      : [state.initiative.holder, ...state.seats.filter(p => p !== state.initiative.holder)];
  for (const playerId of players) {
    const restriction = regroupRestriction(state, playerId);
    if (!restriction) continue;
    for (const arena of ['ground', 'space'] as const) {
      const limit = remainingRegroupReadies(state, playerId, arena);
      const cards = (
        frame.kind === 'ready'
          ? state[arena]
          : frame.cards
              .filter(r => r.incarnation === state.cards[r.instanceId]?.incarnation)
              .map(r => r.instanceId)
      )
        .map(id => instance(state, id))
        .filter(
          card =>
            (frame.kind === 'ready-cards' || card.controller === playerId) &&
            card.zone === arena &&
            isUnit(state, card) &&
            card.exhausted &&
            !cannotReady(state, card, frame.kind === 'ready', playerId),
        );
      if (!limit) (frame.excluded ??= []).push(...cards.map(reference));
      else if (cards.length > limit)
        choices.push({
          kind: 'regroup-ready',
          playerId,
          source: structuredClone(restriction.source),
          arena,
          limit,
          cards: cards.map(reference),
        });
    }
  }
  if (!choices.length) return false;
  frame.excluded ??= [];
  state.execution.frames.unshift(...choices, frame);
  return true;
}
export function regroupReadySelection(_state: GameState, frame: Choice) {
  return { cards: frame.cards.map(c => c.instanceId), min: frame.limit, max: frame.limit };
}
export function acceptRegroupReady(state: GameState, frame: Choice, selections: string[]) {
  const ready = state.execution.frames.find(
    (f): f is Ready => f.kind === 'ready' || f.kind === 'ready-cards',
  );
  if (
    !ready?.excluded ||
    selections.length !== frame.limit ||
    selections.some(id => !frame.cards.some(c => c.instanceId === id))
  )
    throw new Error('Invalid regroup ready choice');
  ready.excluded.push(...frame.cards.filter(card => !selections.includes(card.instanceId)));
}
export function assertRegroupReady(state: GameState, frame: Choice) {
  const restriction = regroupRestriction(state, frame.playerId);
  const continuation = state.execution.frames.find(
    (f): f is Ready => f.kind === 'ready' || f.kind === 'ready-cards',
  );
  if (
    !state.seats.includes(frame.playerId) ||
    frame.source.controller === frame.playerId ||
    remainingRegroupReadies(state, frame.playerId, frame.arena) !== frame.limit ||
    new Set(frame.cards.map(r => r.instanceId)).size !== frame.cards.length ||
    restriction?.source.instanceId !== frame.source.instanceId ||
    restriction.source.incarnation !== frame.source.incarnation ||
    !state.execution.frames.some(
      f => (f.kind === 'ready' || f.kind === 'ready-cards') && f.excluded,
    ) ||
    frame.cards.length <= frame.limit ||
    frame.cards.some(ref => {
      const card = state.cards[ref.instanceId];
      return (
        !card ||
        card.incarnation !== ref.incarnation ||
        !isUnit(state, card) ||
        !card.exhausted ||
        card.zone !== frame.arena ||
        (continuation?.kind === 'ready' && card.controller !== frame.playerId) ||
        cannotReady(state, card, continuation?.kind === 'ready', frame.playerId)
      );
    })
  )
    throw new Error('Invalid regroup ready continuation');
}
