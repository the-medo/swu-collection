import type { UnitDefinition } from '../definition.ts';
export const alphabetSquadronUWing = {
  cardId: 'alphabet-squadron-u-wing--quiet-devotion',
  name: 'Alphabet Squadron U-Wing, Quiet Devotion',
  kind: 'unit',
  unique: true,
  cost: 5,
  power: 5,
  hp: 6,
  arena: 'space',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'regroup-advantage',
      timing: 'regroup-start',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: { kind: 'give-token', token: 'advantage', count: 1 },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
