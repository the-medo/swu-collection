import type { UnitDefinition } from '../definition.ts';

// LAW . Printed text is pinned in the meta effects fixture.
export const roseTicoNowItSWorthIt = {
  cardId: 'rose-tico--now-it-s-worth-it',
  name: "Rose Tico, Now It's Worth It",
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Resistance'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  entersReady: {
    kind: 'units-at-least',
    amount: 1,
    filter: {
      controller: 'friendly',
      unique: false,
    },
  },
} as const satisfies UnitDefinition;
