import { boundReference, type EffectContext } from './bindings.ts';
import type { GameState } from './model.ts';
import { isUpgrade } from './roles.ts';
import { historicalOwnerMatches } from './roles.ts';
export function departedAttachments(state: GameState, context: EffectContext, target: string) {
  const ref = boundReference(context, target, state);
  const departure =
    ref &&
    state.departedUnits.find(
      d => d.reference.instanceId === ref.instanceId && d.reference.incarnation === ref.incarnation,
    );
  return (departure?.upgrades ?? []).flatMap(old => {
    const card = state.cards[old.instanceId];
    return card &&
      card.zone === 'discard' &&
      card.cardId === old.cardId &&
      card.incarnation === old.incarnation &&
      card.visibility === old.visibility &&
      state.departedUpgrades.some(
        d =>
          d.reference.instanceId === old.instanceId &&
          d.reference.incarnation === old.incarnation &&
          d.reference.visibility === old.visibility &&
          d.abilities.some(
            o =>
              o.id === 'self' &&
              o.card.attachedTo?.instanceId === ref!.instanceId &&
              o.card.attachedTo.incarnation === ref!.incarnation,
          ),
      )
      ? [card]
      : [];
  });
}
export function assertDepartedAttachments(
  state: GameState,
  unit: GameState['departedUnits'][number],
) {
  const seen = new Set<string>();
  for (const ref of unit.upgrades) {
    const card = state.cards[ref.instanceId];
    const linked = (c: { attachedTo: { instanceId: string; incarnation: number } | null }) =>
      c.attachedTo?.instanceId === unit.reference.instanceId &&
      c.attachedTo.incarnation === unit.reference.incarnation;
    if (
      !card ||
      card.cardId !== ref.cardId ||
      card.incarnation < ref.incarnation ||
      card.visibility < ref.visibility ||
      seen.has(ref.instanceId) ||
      !historicalOwnerMatches(state, card, ref) ||
      !state.seats.includes(ref.controller) ||
      !isUpgrade(state, ref) ||
      !linked(ref)
    )
      throw new Error('Invalid departed attachment');
    seen.add(ref.instanceId);
  }
  if (unit.upgraded !== !!unit.upgrades.length) throw new Error('Invalid departed upgrade count');
}
