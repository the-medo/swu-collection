import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const grassrootsResistance = {
  cardId: 'grassroots-resistance',
  name: 'Grassroots Resistance',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'damage-unit',
      amount: 3,
      arena: 'any',
      optional: false,
    },
    {
      kind: 'heal-own-base',
      amount: 3,
    },
  ],
} as const satisfies EventDefinition;
