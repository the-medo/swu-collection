import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHeroesOnBothSides = {
  cardId: 'heroes-on-both-sides',
  name: 'Heroes on Both Sides',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Republic', 'Separatist'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        trait: 'Republic',
      },
      optional: true,
      bind: 'republic',
      effects: [
        {
          kind: 'on-unit',
          target: 'republic',
          operation: {
            kind: 'modify',
            power: 2,
            hp: 2,
            duration: 'phase',
            abilities: {
              keywords: ['Saboteur'],
            },
          },
        },
        {
          kind: 'select-unit',
          filter: {
            trait: 'Separatist',
            otherThan: 'republic',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
                abilities: {
                  keywords: ['Saboteur'],
                },
              },
            },
          ],
        },
      ],
      otherwise: [
        {
          kind: 'select-unit',
          filter: {
            trait: 'Separatist',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
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
} as const satisfies EventDefinition;
