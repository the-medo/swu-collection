import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteL337DroidRevolutionary = {
  cardId: 'l3-37--droid-revolutionary',
  name: 'L3-37, Droid Revolutionary',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld', 'Droid'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 2,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 4,
      aspects: ['Cunning', 'Heroism'],
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-captured',
          bind: 'captive',
          optional: true,
          effects: [
            {
              kind: 'rescue-captured',
              target: 'captive',
              effects: [],
            },
          ],
          otherwise: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
