import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const overpower = {
  cardId: 'overpower',
  name: 'Overpower',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Innate'],
  cost: 3,
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
            kind: 'modify',
            power: 3,
            hp: 3,
            duration: 'phase',
            abilities: {
              keywords: ['Overwhelm'],
            },
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
