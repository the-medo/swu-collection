import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const displayOfStrength = {
  cardId: 'display-of-strength',
  name: 'Display of Strength',
  kind: 'event',
  aspects: ['Command'],
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
            power: 3,
            hp: 3,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
