import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const forceSlow = {
  cardId: 'force-slow',
  name: 'Force Slow',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        exhausted: true,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: -8,
            hp: 0,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
