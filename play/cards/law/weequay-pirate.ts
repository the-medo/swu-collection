import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const weequayPirate = {
  cardId: 'weequay-pirate',
  name: 'Weequay Pirate',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 1,
          },
        },
      ],
      condition: {
        kind: 'no-resources-paid',
        target: 'source',
      },
    },
  ],
} as const satisfies UnitDefinition;
