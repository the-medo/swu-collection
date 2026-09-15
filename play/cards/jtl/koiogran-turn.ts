import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const koiogranTurn = {
  cardId: 'koiogran-turn',
  name: 'Koiogran Turn',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        anyTrait: ['Fighter', 'Transport'],
        powerAtMost: 6,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'ready',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
