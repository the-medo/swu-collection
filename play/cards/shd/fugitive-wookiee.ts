import type { UnitDefinition } from '../definition.ts';

// Official text is pinned in leader-bounties.json.
export const fugitiveWookiee = {
  cardId: 'fugitive-wookiee',
  name: 'Fugitive Wookiee',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Wookiee'],
  cost: 2,
  power: 3,
  hp: 3,
  arena: 'ground',
  bounties: [
    {
      id: 'reward',
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
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
