import type { CatalogContext } from '../cards/catalog.ts';
import { matchingUnits } from './targets.ts';
import { contextController } from './bindings.ts';
import { activeAbilities } from './abilities.ts';
import { numericValue } from './values.ts';
import { cardAspects, cardPrintedTitle } from './identity.ts';
import { namedAbilityLoss } from './naming.ts';
import { canAttach } from './attachments.ts';
import { cardTraits } from './attributes.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import type { CardFilter } from '../cards/definition.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { boundUnit, boundReference, type EffectContext } from './bindings.ts';
import type { CardReference, Frame, GameState } from './model.ts';
import { instance, opponent, reference } from './state.ts';
export function hasPrintedCost(state: CatalogContext, ref: CardReference): boolean {
  const definition = cardDefinition(state, ref.cardId);
  return definition.kind === 'leader' ? definition.printedCost !== null : 'cost' in definition;
}
export function printedCost(state: CatalogContext, ref: CardReference): number {
  const definition = cardDefinition(state, ref.cardId);
  return definition.kind === 'leader'
    ? (definition.printedCost ?? 0)
    : 'cost' in definition
      ? definition.cost
      : 0;
}
export function matchesCard(
  state: GameState,
  ref: CardReference,
  filter: CardFilter,
  context: EffectContext,
): boolean {
  const definition = cardDefinition(state, ref.cardId);
  const shared = filter.sharesAspectWith && boundReference(context, filter.sharesAspectWith, state);
  const sharedTrait =
    filter.sharesTraitWith && boundReference(context, filter.sharesTraitWith, state);
  const other = filter.otherThan && boundReference(context, filter.otherThan, state);
  const host = filter.attachesTo && boundUnit(state, context, filter.attachesTo);
  return (
    (!filter.otherThan ||
      (!!other &&
        (ref.instanceId !== other.instanceId || ref.incarnation !== other.incarnation))) &&
    (!filter.sharesTraitWith ||
      (!!sharedTrait &&
        cardTraits(state, ref).some(t => cardTraits(state, sharedTrait).includes(t)))) &&
    (filter.costAtMost === undefined ||
      (hasPrintedCost(state, ref) &&
        printedCost(state, ref) <= numericValue(state, context, filter.costAtMost))) &&
    (!filter.withoutTrait || !cardTraits(state, ref).includes(filter.withoutTrait)) &&
    (!filter.notName || cardPrintedTitle(state, ref) !== filter.notName) &&
    (!filter.sharesFriendlyUnitAspect ||
      matchingUnits(state, contextController(context), { controller: 'friendly' }, context).some(
        unit => cardAspects(state, unit).some(a => cardAspects(state, ref).includes(a)),
      )) &&
    (!filter.sharesFriendlyUnitTrait ||
      matchingUnits(state, contextController(context), { controller: 'friendly' }, context).some(
        unit => cardTraits(state, unit).some(trait => cardTraits(state, ref).includes(trait)),
      )) &&
    (!filter.owner ||
      state.cards[ref.instanceId]!.owner ===
        (filter.owner === 'self'
          ? contextController(context)
          : opponent(state, contextController(context)))) &&
    (!filter.hasKeyword ||
      !!effectiveAbilities(state, state.cards[ref.instanceId]!).keywords?.includes(
        filter.hasKeyword,
      )) &&
    (!filter.printedKeyword ||
      !!activeAbilities(state, state.cards[ref.instanceId]!).keywords?.includes(
        filter.printedKeyword,
      )) &&
    (filter.costLessThan === undefined ||
      (hasPrintedCost(state, ref) &&
        printedCost(state, ref) < numericValue(state, context, filter.costLessThan))) &&
    (!filter.withoutAspect || !cardAspects(state, ref).includes(filter.withoutAspect)) &&
    (!filter.name || cardPrintedTitle(state, ref) === filter.name) &&
    (!filter.differentNameFrom ||
      filter.differentNameFrom.every(name => {
        const other = boundReference(context, name, state);
        return !!other && cardPrintedTitle(state, ref) !== cardPrintedTitle(state, other);
      })) &&
    (!filter.inGroup ||
      !!context.groups?.[filter.inGroup]?.some(
        c =>
          c.instanceId === ref.instanceId &&
          c.incarnation === ref.incarnation &&
          c.visibility === ref.visibility,
      )) &&
    (!filter.playAs ||
      (filter.playAs === 'non-unit' && definition.kind === 'event') ||
      (filter.playAs !== 'pilot' && definition.kind === 'upgrade') ||
      (definition.kind === 'unit' &&
        !!definition.piloting?.length &&
        !namedAbilityLoss(state, state.cards[ref.instanceId]!))) &&
    (!filter.arena || (definition.kind === 'unit' && definition.arena === filter.arena)) &&
    (!filter.attachesTo || (!!host && canAttach(state, state.cards[ref.instanceId]!, host))) &&
    (!filter.sameNameAs ||
      (!!boundReference(context, filter.sameNameAs, state) &&
        cardPrintedTitle(state, ref) ===
          cardPrintedTitle(state, boundReference(context, filter.sameNameAs, state)!))) &&
    (!filter.named ||
      (!!context.names?.[filter.named] &&
        cardPrintedTitle(state, ref) === context.names[filter.named])) &&
    (!filter.defeatedThisPhase ||
      state.phaseHistory.defeated.some(
        card =>
          card.instanceId === ref.instanceId &&
          card.incarnation === ref.incarnation &&
          state.cards[ref.instanceId]?.zone === 'discard',
      )) &&
    (filter.whenDefeated === undefined ||
      !!effectiveAbilities(state, state.cards[ref.instanceId]!).triggers?.some(
        t => t.timing === 'defeated',
      ) === filter.whenDefeated) &&
    (filter.maxPower === undefined ||
      (definition.kind === 'unit' && definition.power <= filter.maxPower)) &&
    (!filter.anyAspect || filter.anyAspect.some(a => cardAspects(state, ref).includes(a))) &&
    (!filter.notKind || definition.kind !== filter.notKind) &&
    (!filter.kind || definition.kind === filter.kind) &&
    (!filter.aspect || cardAspects(state, ref).includes(filter.aspect)) &&
    (!filter.trait || cardTraits(state, ref).includes(filter.trait)) &&
    (!filter.anyTrait || filter.anyTrait.some(trait => cardTraits(state, ref).includes(trait))) &&
    (filter.unique === undefined || !!definition.unique === filter.unique) &&
    (filter.maxCost === undefined ||
      (hasPrintedCost(state, ref) && printedCost(state, ref) <= filter.maxCost)) &&
    (filter.minCost === undefined ||
      (hasPrintedCost(state, ref) && printedCost(state, ref) >= filter.minCost)) &&
    (!filter.costParity ||
      (hasPrintedCost(state, ref) &&
        printedCost(state, ref) % 2 === (filter.costParity === 'odd' ? 1 : 0))) &&
    (!filter.sharesAspectWith ||
      (!!shared && cardAspects(state, ref).some(a => cardAspects(state, shared).includes(a))))
  );
}
export function inspectionOwner(
  state: GameState,
  playerId: string,
  effect: Extract<import('../cards/definition.ts').CardEffect, { kind: 'inspect-zone' }>,
  context: EffectContext,
) {
  return effect.player === 'self'
    ? playerId
    : effect.player === 'enemy'
      ? state.seats.find(id => id !== playerId)
      : effect.ownerOf
        ? boundUnit(state, context, effect.ownerOf)?.controller
        : undefined;
}
export type InspectionFrame = Extract<Frame, { kind: 'zone-inspection' }>;
export function inspectionChooser(
  state: GameState,
  playerId: string,
  owner: string,
  effect: Pick<InspectionFrame['effect'], 'chooser'>,
) {
  return effect.chooser === 'self'
    ? playerId
    : effect.chooser === 'enemy'
      ? opponent(state, playerId)
      : owner;
}
export function inspectionCards(
  state: GameState,
  owner: string,
  effect: Pick<InspectionFrame['effect'], 'zone' | 'top' | 'onlyFromGroup'>,
  context?: EffectContext,
) {
  if (effect.top !== undefined && effect.zone !== 'deck')
    throw new Error('Only deck inspection has a top limit');
  return state.players[owner]![effect.zone].slice(0, effect.top)
    .map(id => reference(instance(state, id)))
    .filter(
      ref =>
        !effect.onlyFromGroup ||
        context?.groups?.[effect.onlyFromGroup]?.some(
          c =>
            c.instanceId === ref.instanceId &&
            c.incarnation === ref.incarnation &&
            c.visibility === ref.visibility,
        ),
    );
}
export function inspectionSelection(state: GameState, frame: InspectionFrame) {
  const cards = (frame.effect.max === 0 ? [] : frame.cards)
    .filter(ref => matchesCard(state, ref, frame.effect.filter, frame))
    .map(ref => ref.instanceId);
  return {
    cards,
    min: Math.min(frame.effect.min, cards.length),
    max: Math.min(frame.effect.max, cards.length),
  };
}
export function assertInspection(state: GameState, frame: InspectionFrame) {
  const owner = inspectionOwner(state, frame.playerId, frame.effect, frame);
  const chooser = owner && inspectionChooser(state, frame.playerId, owner, frame.effect);
  if (frame.owner !== owner || frame.chooser !== chooser || frame.effect.min > frame.effect.max)
    throw new Error('Invalid inspection participants');
  const cards = inspectionCards(state, frame.owner, frame.effect, frame);
  if (JSON.stringify(cards) !== JSON.stringify(frame.cards.map(reference)))
    throw new Error('Invalid inspection cards');
}
