import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const hothLieutenant = {
  cardId: 'hoth-lieutenant',
  name: 'Hoth Lieutenant',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'attack-with-unit',
          filter: {
            otherThan: 'source',
          },
          powerBonus: 2,
        },
      ],
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
