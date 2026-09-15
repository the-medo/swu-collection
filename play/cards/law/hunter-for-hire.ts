import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-attributes.json.
export const hunterForHire = {
  cardId: 'hunter-for-hire',
  name: 'Hunter For Hire',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 3,
  power: 4,
  hp: 4,
  arena: 'ground',
  actions: [
    {
      id: 'hire',
      anyPlayer: true,
      costs: [
        {
          kind: 'defeat-friendly-credit',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'take-control',
            player: 'self',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
