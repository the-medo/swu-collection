import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheMandalorianWhereverIGoHeGoes = {
  cardId: 'the-mandalorian--wherever-i-go--he-goes',
  name: 'The Mandalorian, Wherever I Go, He Goes',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Mandalorian', 'Bounty Hunter'],
  cost: 6,
  unique: true,
  power: 5,
  hp: 6,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            maxCost: 2,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'heal',
                amount: 'all',
              },
            },
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
