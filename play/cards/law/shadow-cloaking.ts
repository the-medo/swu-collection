import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const shadowCloaking = {
  cardId: 'shadow-cloaking',
  name: 'Shadow Cloaking',
  kind: 'event',
  aspects: ['Vigilance', 'Aggression', 'Villainy'],
  traits: ['Tactic'],
  cost: 5,
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
            kind: 'ready',
          },
        },
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'give-token',
            token: 'shield',
            count: 1,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
