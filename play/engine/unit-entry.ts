import { cardDefinition } from '../cards/catalog.ts';
import { instanceDefinition } from './instance-definition.ts';
import { isUnit } from './attachments.ts';
import { unitIsLeader } from './attributes.ts';
import { conditionMatches } from './conditions.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { namedAbilityLoss } from './naming.ts';
import { friendlyUnitsEnterReady, recordUnitEntry } from './phase-history.ts';
import { fact, move, reference } from './state.ts';
import { matchesUnit } from './targets.ts';
import { abilitySources } from './triggers.ts';
import type { CardInstance, GameState, UnitEntry } from './model.ts';

export function queueCopyEntry(
  state: GameState,
  card: CardInstance,
  playerId: string,
  ready: boolean,
  completion: Pick<UnitEntry, 'play' | 'guard'> = {},
) {
  const definition = cardDefinition(state, card.cardId);
  if (definition.kind !== 'unit' || !definition.copyOnEntry || namedAbilityLoss(state, card))
    return false;
  fact(state, 'revealed', playerId, [card]);
  move(state, card, 'set-aside');
  card.controller = playerId;
  card.incarnation++;
  card.damage = 0;
  card.exhausted = false;
  state.execution.frames.unshift({
    kind: 'unit-entry',
    playerId,
    card: reference(card),
    ready,
    ...completion,
  });
  return true;
}

export function copyEntryChoices(state: GameState, entry: UnitEntry) {
  const card = state.cards[entry.card.instanceId]!,
    definition = cardDefinition(state, card.cardId);
  if (definition.kind !== 'unit' || !definition.copyOnEntry) return [];
  return [...state.ground, ...state.space]
    .map(id => state.cards[id]!)
    .filter(
      target =>
        isUnit(state, target) &&
        !unitIsLeader(state, target) &&
        matchesUnit(state, target, entry.playerId, definition.copyOnEntry!.filter, {
          source: card,
        }),
    );
}

// Complete entry replacement choices before any entered unit participates in
// state maintenance or triggers. Simultaneously rescued copies see the same board.
export function prioritizeCopyEntry(state: GameState) {
  const pending = state.execution.frames.findIndex(
    f => f.kind === 'unit-entry' && f.choice === undefined,
  );
  const first =
    pending < 0 ? state.execution.frames.findIndex(f => f.kind === 'unit-entry') : pending;
  if (first > 0) state.execution.frames.unshift(state.execution.frames.splice(first, 1)[0]!);
}

export function completeCopyEntries(state: GameState): UnitEntry[] {
  const entries = state.execution.frames.filter((f): f is UnitEntry => f.kind === 'unit-entry');
  if (entries.some(e => e.choice === undefined)) throw new Error('Unresolved entry replacement');
  const ready = entries.map(entry => {
    const card = state.cards[entry.card.instanceId]!;
    if (entry.choice) card.copiedCardId = entry.choice;
    const definition = instanceDefinition(state, card);
    return (
      entry.ready ||
      friendlyUnitsEnterReady(state, entry.playerId) ||
      (definition.kind === 'unit' &&
        !namedAbilityLoss(state, card) &&
        !!definition.entersReady &&
        conditionMatches(state, entry.playerId, definition.entersReady, { source: card })) ||
      (!entry.play &&
        abilitySources(state).some(
          source =>
            source.controller === entry.playerId &&
            effectiveAbilities(state, source).friendlyRescueReady,
        ))
    );
  });
  entries.forEach((entry, index) => {
    const card = state.cards[entry.card.instanceId]!,
      definition = instanceDefinition(state, card);
    if (definition.kind !== 'unit') throw new Error('Invalid entering copy');
    move(state, card, definition.arena);
    card.exhausted = !ready[index];
    card.damage = 0;
    // References reserved by nested play effects and delays must retain the
    // copied identity for last-known-information after this incarnation leaves.
    const hydrate = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const object = value as Record<string, unknown>;
      if (
        object.instanceId === card.instanceId &&
        object.incarnation === card.incarnation &&
        object.cardId === card.cardId &&
        card.copiedCardId
      )
        object.copiedCardId = card.copiedCardId;
      for (const child of Object.values(object)) hydrate(child);
    };
    hydrate(state.execution.frames);
    hydrate(state.delayedEffects);
  });
  state.execution.frames = state.execution.frames.filter(f => f.kind !== 'unit-entry');
  for (const entry of entries)
    if (!entry.play) {
      const card = state.cards[entry.card.instanceId]!;
      recordUnitEntry(state, card);
      fact(state, 'rescued', entry.playerId, [...(entry.guard ? [entry.guard] : []), card]);
    }
  return entries;
}
