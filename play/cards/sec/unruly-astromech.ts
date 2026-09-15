import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const unrulyAstromech = {
  cardId: 'unruly-astromech',
  name: 'Unruly Astromech',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Droid'],
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
