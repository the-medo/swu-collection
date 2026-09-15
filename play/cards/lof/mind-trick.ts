import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const mindTrick = {
  cardId: 'mind-trick',
  name: 'Mind Trick',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-units',
      filter: {},
      budget: {
        stat: 'power',
        max: 4,
      },
      bind: 'affected',
      effects: [
        {
          kind: 'exhaust-group',
          group: 'affected',
        },
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Force',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'modify-units',
              filter: {
                inGroup: 'affected',
              },
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                loseAbilities: true,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
