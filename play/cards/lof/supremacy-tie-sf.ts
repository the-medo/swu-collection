import type { UnitDefinition } from '../definition.ts';

// LOF 34. Printed text is pinned in the meta foundation fixture.
export const supremacyTieSf = {
  cardId: 'supremacy-tie-sf',
  name: 'Supremacy TIE/sf',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['First Order', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
