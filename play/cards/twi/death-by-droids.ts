import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDeathByDroids = {
  cardId: 'death-by-droids',
  name: 'Death by Droids',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 5,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        maxCost: 3,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'defeat',
          },
        },
      ],
    },
    {
      kind: 'create-unit',
      cardId: 'battle-droid',
      count: 2,
    },
  ],
} as const satisfies EventDefinition;
