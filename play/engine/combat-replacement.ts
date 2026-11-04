import { cardDefinition } from '../cards/catalog.ts';
import { canPayAbilityCosts } from './abilities.ts';
import { isUnit } from './attachments.ts';
import { combatAmount, inCombat, type Attack } from './combat.ts';
import { cardAspects } from './identity.ts';
import { namedAbilityLoss } from './naming.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { boundUnit } from './bindings.ts';
import { isToken } from './roles.ts';
import { recordUnitEntry } from './phase-history.ts';
import { canAffectWithAbility } from './protection.ts';
import { matchesUnit } from './targets.ts';
import { aspectPenalty, fact, instance, move, reference } from './state.ts';
import type { CardInstance, Frame, GameState, Intent } from './model.ts';

export function combatReplacementPayment(state: GameState, card: CardInstance) {
  const definition = cardDefinition(state, card.cardId);
  if (definition.kind !== 'unit' || !definition.handCombatReplacement)
    throw new Error('Missing hand combat replacement');
  const player = state.players[card.controller]!;
  const providers = new Set([player.base, player.leader]);
  for (const unit of Object.values(state.cards))
    if (
      isUnit(state, unit) &&
      unit.controller === card.controller &&
      effectiveAbilities(state, unit).providesAspects
    )
      providers.add(unit.instanceId);
  return (
    definition.handCombatReplacement.cost +
    aspectPenalty(
      definition.handCombatReplacement.aspects,
      [...providers].flatMap(id => cardAspects(state, instance(state, id))),
    )
  );
}

export function combatReplacementIntents(state: GameState, attack: Attack): Intent[] {
  const attacker = instance(state, attack.attacker.instanceId);
  const defender = instance(state, attack.defender.instanceId);
  if (
    attack.combatReplacementPassed ||
    !inCombat(state, attack, attacker, attack.attacker) ||
    cardDefinition(state, defender.cardId).kind !== 'base' ||
    combatAmount(state, attack, attacker) <= 0
  )
    return [];
  // Use the fixed pool of cards belonging to this deck, regardless of their
  // current hidden zone or affordability. Drawing/discarding Asajj must not
  // turn this public timing window on or off.
  const possible = Object.values(state.cards).some(card => {
    const definition = cardDefinition(state, card.cardId);
    return (
      card.owner === attacker.controller &&
      definition.kind === 'unit' &&
      !!definition.handCombatReplacement &&
      matchesUnit(state, attacker, attacker.controller, definition.handCombatReplacement.attacker, {
        source: card,
      })
    );
  });
  if (!possible) return [];
  const candidates = state.players[attacker.controller]!.hand.map(id => instance(state, id)).filter(
    card => {
      const definition = cardDefinition(state, card.cardId);
      return (
        definition.kind === 'unit' &&
        !!definition.handCombatReplacement &&
        !namedAbilityLoss(state, card) &&
        matchesUnit(state, attacker, card.controller, definition.handCombatReplacement.attacker, {
          source: card,
        }) &&
        canPayAbilityCosts(state, card, {
          id: 'combat-replacement',
          costs: [{ kind: 'resources', amount: combatReplacementPayment(state, card) }],
          limit: null,
          effects: [],
        })
      );
    },
  );
  return [
    ...candidates.map(card => ({ kind: 'target' as const, card: card.instanceId })),
    { kind: 'decline-effect' },
  ];
}

export function replaceAttacker(state: GameState, frame: Extract<Frame, { kind: 'effect' }>) {
  const attacker = boundUnit(state, frame, 'attacker');
  const replacement = boundUnit(state, frame, 'replacement');
  const attack =
    attacker &&
    state.attacks.find(
      a =>
        a.attacker.instanceId === attacker.instanceId &&
        a.attacker.incarnation === attacker.incarnation,
    );
  if (
    !attack ||
    !attacker ||
    !replacement ||
    replacement.zone !== 'hand' ||
    replacement.owner !== frame.playerId ||
    !inCombat(state, attack, attacker, attack.attacker)
  )
    return;
  const definition = cardDefinition(state, replacement.cardId);
  if (definition.kind !== 'unit' || !definition.handCombatReplacement) return;
  // Returning a token is replaced by putting it aside; protected units stay.
  // The remaining instruction still puts the incoming unit into play (§7.1.3).
  if (canAffectWithAbility(state, attacker, frame.source, 'return-to-hand')) {
    fact(
      state,
      isToken(cardDefinition(state, attacker.cardId)) ? 'left-play' : 'returned-to-hand',
      frame.playerId,
      [frame.source, attacker],
    );
    move(state, attacker, 'hand');
    attacker.damage = 0;
  }
  move(state, replacement, definition.arena);
  replacement.controller = frame.playerId;
  replacement.exhausted = true;
  replacement.damage = 0;
  attack.attacker = reference(replacement);
  attack.combatReplacementPassed = true;
  attack.removedFromCombat = attack.removedFromCombat.filter(
    ref => ref.instanceId === attack.defender.instanceId,
  );
  // These grants affected the previously chosen attacker, not its replacement.
  attack.powerBonus = 0;
  attack.grantedAbilities = [];
  attack.attackerFirst = false;
  delete attack.damageStat;
  delete attack.swapRaidRestore;
  delete attack.order;
  recordUnitEntry(state, replacement);
  fact(state, 'ability-used', frame.playerId, [replacement]);
}
