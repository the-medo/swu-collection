import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMysticReflection = {
  cardId: 'mystic-reflection',
  name: 'Mystic Reflection',
  kind: 'event',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
      optional: false,
      bind: 'chosen',
      effects: [
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
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -2,
                hp: -2,
                duration: 'phase',
              },
            },
          ],
          otherwise: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -2,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
