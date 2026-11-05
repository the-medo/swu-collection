import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOverwhelmingBarrage = {
  cardId: 'overwhelming-barrage',
  name: 'Overwhelming Barrage',
  kind: 'event',
  aspects: ['Villainy', 'Command'],
  traits: ['Tactic'],
  cost: 5,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
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
          },
        },
        {
          kind: 'divide-damage',
          source: 'chosen',
          amount: {
            kind: 'unit-stat',
            target: 'chosen',
            stat: 'power',
          },
          filter: {
            otherThan: 'chosen',
          },
          optional: false,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
