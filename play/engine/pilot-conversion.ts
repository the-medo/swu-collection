import type { ConversionFilter } from '../cards/definition.ts';
import { collectTriggers } from './triggers.ts';
import { pendingUpgradeDefeats } from './upgrade-defeat.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { attach, attachedUpgrades, canAttach, defeatUpgrades, isUnit } from './attachments.ts';
import { cardTraits } from './attributes.ts';
import { rescueCaptured } from './capture.ts';
import { conversionFilterSchema, type CardInstance, type GameState } from './model.ts';
import { isUpgrade, upgradeProfile } from './roles.ts';
import { fact, move, reference } from './state.ts';

export function attachablePilots(state: GameState, playerId: string, host?: CardInstance) {
  if (!host || !isUnit(state, host)) return [];
  return [...state.ground, ...state.space]
    .map(id => state.cards[id]!)
    .filter(
      card =>
        card.controller === playerId &&
        card.instanceId !== host.instanceId &&
        cardTraits(state, card).includes('Pilot') &&
        !!upgradeProfile(cardDefinition(state, card.cardId)) &&
        (isUnit(state, card) ||
          (isUpgrade(state, card) &&
            card.attachedTo?.instanceId !== host.instanceId &&
            canAttach(state, card, host))),
    );
}
export function detachablePilots(state: GameState) {
  return [...state.ground, ...state.space]
    .map(id => state.cards[id]!)
    .filter(card => {
      const definition = cardDefinition(state, card.cardId);
      return (
        isUpgrade(state, card) &&
        cardTraits(state, card).includes('Pilot') &&
        (definition.kind === 'unit' || definition.kind === 'leader')
      );
    });
}
// V8 §§3.5.6, 3.6.3b: converting an in-play unit does not play Piloting.
// The attaching ability supplies its own restriction, retained until this role ends.
export function attachPilot(
  state: GameState,
  pilot: CardInstance,
  host: CardInstance,
  source: CardInstance,
  restriction?: ConversionFilter,
) {
  if (isUnit(state, pilot)) {
    defeatUpgrades(state, attachedUpgrades(state, pilot));
    if (pendingUpgradeDefeats(state).length) {
      state.execution.frames.unshift({
        kind: 'convert-pilot',
        ...(restriction ? { restriction: conversionFilterSchema.parse(restriction) } : {}),
        source: structuredClone(source),
        playerId: source.controller,
        pilot: reference(pilot),
        host: reference(host),
      });
      return false;
    }
  }
  finishPilotAttachment(state, pilot, host, source, restriction);
  return true;
}
export function finishPilotAttachment(
  state: GameState,
  pilot: CardInstance,
  host: CardInstance,
  source: CardInstance,
  restriction?: ConversionFilter,
) {
  if (isUnit(state, pilot)) {
    for (const id of [...state.captured]) {
      const captive = state.cards[id]!;
      if (
        captive.capturedBy?.instanceId === pilot.instanceId &&
        captive.capturedBy.incarnation === pilot.incarnation
      )
        rescueCaptured(state, captive);
    }
    for (const attack of state.attacks)
      if (
        [attack.attacker, attack.defender].some(
          ref => ref.instanceId === pilot.instanceId && ref.incarnation === pilot.incarnation,
        ) &&
        !attack.removedFromCombat.some(
          ref => ref.instanceId === pilot.instanceId && ref.incarnation === pilot.incarnation,
        )
      )
        attack.removedFromCombat.push(reference(pilot));
    pilot.damage = 0;
    move(state, pilot, host.zone);
    if (cardDefinition(state, pilot.cardId).kind === 'leader') pilot.deployedAs = 'upgrade';
    pilot.attachedTo = { instanceId: host.instanceId, incarnation: host.incarnation };
    pilot.attachmentRestriction = restriction
      ? { kind: 'filter', filter: conversionFilterSchema.parse(restriction) }
      : { kind: 'exact-host', host: { ...pilot.attachedTo } };
    fact(state, 'converted-to-upgrade', source.controller, [source, pilot, host]);
  }
  attach(state, pilot, host);
}
// The physical copy stays in play: no incarnation change, entry or play triggers.
export function detachPilot(state: GameState, pilot: CardInstance, source: CardInstance) {
  if (!isUpgrade(state, pilot)) return false;
  const parent = pilot.attachedTo && state.cards[pilot.attachedTo.instanceId];
  const parentRef = parent && { ...reference(parent), incarnation: pilot.attachedTo!.incarnation };
  if (parent && parent.incarnation === pilot.attachedTo?.incarnation)
    collectTriggers(state, 'detached', [pilot], parent);
  pilot.attachedTo = null;
  delete pilot.attachmentRestriction;
  if (cardDefinition(state, pilot.cardId).kind === 'leader') pilot.deployedAs = 'unit';
  move(state, pilot, 'ground');
  pilot.damage = 0;
  pilot.exhausted = true;
  fact(state, 'converted-to-unit', source.controller, [
    source,
    pilot,
    ...(parentRef ? [parentRef] : []),
  ]);
  return true;
}
