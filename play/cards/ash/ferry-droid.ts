import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const ferryDroid = {
  cardId: 'ferry-droid',
  name: 'Ferry Droid',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Droid'],
  cost: 3,
  power: 1,
  hp: 5,
  arena: 'ground',
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
            token: 'advantage',
            count: 4,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
