import type { EventDefinition } from '../definition.ts';

// JTL . V8 rules; printed text pinned in meta combat fixture.
export const noDisintegrations = {
  cardId: 'no-disintegrations',
  name: 'No Disintegrations',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Plan'],
  cost: 3,
  effects: [
    {
      kind: 'damage-unit',
      amount: 'remaining-hp-minus-one',
      arena: 'any',
      optional: false,
      filter: {
        nonLeader: true,
      },
    },
  ],
} as const satisfies EventDefinition;
