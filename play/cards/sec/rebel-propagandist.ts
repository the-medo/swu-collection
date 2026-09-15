import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const rebelPropagandist = {
  cardId: 'rebel-propagandist',
  name: 'Rebel Propagandist',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Official'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 1,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Saboteur'],
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 1,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Saboteur'],
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
