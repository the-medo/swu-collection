import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGuardingTheWay = {
  cardId: 'guarding-the-way',
  name: 'Guarding the Way',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            abilities: {
              keywords: ['Sentinel'],
            },
          },
        },
        {
          kind: 'if',
          condition: {
            kind: 'initiative',
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
