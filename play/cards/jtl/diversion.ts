import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const diversion = {
  cardId: 'diversion',
  name: 'Diversion',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Gambit'],
  cost: 1,
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
            power: 0,
            hp: 0,
            duration: 'phase',
            abilities: {
              keywords: ['Sentinel'],
            },
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
