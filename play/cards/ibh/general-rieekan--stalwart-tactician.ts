import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const generalRieekanStalwartTactician = {
  cardId: 'general-rieekan--stalwart-tactician',
  name: 'General Rieekan, Stalwart Tactician',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Official'],
  unique: true,
  cost: 4,
  power: 2,
  hp: 6,
  arena: 'ground',
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'attack-with-unit',
          filter: {
            otherThan: 'source',
            anyAspect: ['Heroism'],
          },
          powerBonus: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
