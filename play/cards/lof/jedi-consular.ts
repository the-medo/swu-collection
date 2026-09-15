import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const jediConsular = {
  cardId: 'jedi-consular',
  name: 'Jedi Consular',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  actions: [
    {
      id: 'force-play',
      costs: [
        {
          kind: 'exhaust-self',
        },
        {
          kind: 'force',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'unit',
          },
          discount: 2,
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
