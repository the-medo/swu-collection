import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const politicalBully = {
  cardId: 'political-bully',
  name: 'Political Bully',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Republic', 'Official'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 2,
              },
            },
          ],
        },
      ],
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          trait: 'Official',
        },
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
