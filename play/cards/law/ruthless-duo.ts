import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const ruthlessDuo = {
  cardId: 'ruthless-duo',
  name: 'Ruthless Duo',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 4,
  power: 3,
  hp: 5,
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
          anyAspect: ['Villainy'],
        },
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
