import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const forceIllusion = {
  cardId: 'force-illusion',
  name: 'Force Illusion',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Force', 'Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'exhaust',
          },
        },
      ],
    },
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
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
