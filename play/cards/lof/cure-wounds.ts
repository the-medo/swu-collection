import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const cureWounds = {
  cardId: 'cure-wounds',
  name: 'Cure Wounds',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'pay',
      costs: [
        {
          kind: 'force',
        },
      ],
      optional: false,
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
              operation: {
                kind: 'heal',
                amount: 6,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
