import type { EventDefinition } from '../definition.ts';

// JTL 125. Printed text is pinned in meta-board fixture.
export const airSuperiority = {
  cardId: 'air-superiority',
  name: 'Air Superiority',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'more-units-than-opponent',
        arena: 'space',
      },
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 4,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
