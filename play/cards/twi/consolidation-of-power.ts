import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteConsolidationOfPower = {
  cardId: 'consolidation-of-power',
  name: 'Consolidation of Power',
  kind: 'event',
  aspects: ['Command', 'Villainy'],
  traits: ['Plan'],
  cost: 6,
  effects: [
    {
      kind: 'select-units',
      filter: {
        controller: 'friendly',
      },
      bind: 'chosen',
      min: 0,
      max: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
        },
      },
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'unit',
            costAtMost: {
              kind: 'group-stat-sum',
              group: 'chosen',
              stat: 'power',
            },
          },
          optional: true,
          free: true,
        },
        {
          kind: 'defeat-group',
          group: 'chosen',
          countAs: 'defeated',
          effects: [],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
