import { cardTraits } from './attributes.ts';
import type { SimpleAbilities } from '../cards/definition.ts';
import { keywordNames } from './effective-abilities.ts';
import { matchesCard } from './inspection.ts';
import { cannotGainKeywords } from './lasting.ts';
import { isUnit } from './attachments.ts';
import type { CardInstance, GameState } from './model.ts';

export function matchingPlayModifiers(
  state: GameState,
  card: CardInstance,
  asUnit: boolean,
  using?: 'plot' | 'smuggle',
) {
  return state.playModifiers.filter(
    m =>
      m.playerId === card.controller &&
      (!m.optionalFreeCopy || m.optionalFreeCopy === card.cardId) &&
      (!m.using || m.using === using) &&
      (m.filter.kind !== 'unit' || asUnit) &&
      matchesCard(state, card, m.filter, { source: m.source, playerId: m.playerId }),
  );
}

// Modified play instructions grant their unconditional keywords when intent is
// declared (v8 §6.2.1). Payment-conditional and When Played grants start later.
export function playKeywordNames(
  state: GameState,
  card: CardInstance,
  asUnit: boolean,
  phaseAbilities?: SimpleAbilities,
  using?: 'plot' | 'smuggle',
): string[] {
  const names = new Set(keywordNames(state, card));
  if (cannotGainKeywords(state, card)) return [...names];
  const fleet = asUnit
    ? state.keywordGrants
        .filter(grant => {
          const current = state.cards[grant.source.instanceId];
          return (
            current?.incarnation === grant.source.incarnation &&
            ['ground', 'space'].includes(current.zone) &&
            card.controller === grant.playerId &&
            cardTraits(state, card).includes(grant.trait)
          );
        })
        .map(grant => grant.abilities)
    : [];
  const grants = [
    ...fleet,
    ...matchingPlayModifiers(state, card, asUnit, using).map(m => m.phaseAbilities),
    phaseAbilities,
  ];
  for (const grant of grants) {
    for (const keyword of grant?.keywords ?? []) names.add(keyword);
    if (grant?.exploit !== undefined) names.add('Exploit');
    if (grant?.bounties?.length) names.add('Bounty');
    if (grant?.raid !== undefined) names.add('Raid');
    if (grant?.restore !== undefined) names.add('Restore');
  }
  return [...names];
}
export function sharesPlayKeyword(
  state: GameState,
  card: CardInstance,
  unit: CardInstance,
  phaseAbilities?: SimpleAbilities,
  using?: 'plot' | 'smuggle',
) {
  if (!isUnit(state, unit)) return false;
  const names = new Set(keywordNames(state, unit));
  return playKeywordNames(state, card, true, phaseAbilities, using).some(name => names.has(name));
}
export function sharesFriendlyPlayKeyword(
  state: GameState,
  card: CardInstance,
  phaseAbilities?: SimpleAbilities,
  using?: 'plot' | 'smuggle',
) {
  const names = new Set(playKeywordNames(state, card, true, phaseAbilities, using));
  if (!names.size) return false;
  return [...state.ground, ...state.space].some(id => {
    const unit = state.cards[id]!;
    return (
      unit.instanceId !== card.instanceId &&
      unit.controller === card.controller &&
      keywordNames(state, unit).some(name => names.has(name))
    );
  });
}
