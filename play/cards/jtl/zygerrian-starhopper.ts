import type { UnitDefinition } from '../definition.ts';

// JTL 183. Printed text is pinned in meta-force-indirect fixture.
export const zygerrianStarhopper = {
  cardId: 'zygerrian-starhopper',
  name: 'Zygerrian Starhopper',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'indirect-damage',
          amount: 2,
          recipient: 'chosen',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
