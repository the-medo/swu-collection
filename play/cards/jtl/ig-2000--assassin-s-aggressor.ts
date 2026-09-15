import type { UnitDefinition } from '../definition.ts';

// JTL . V8 rules; printed text pinned in meta combat fixture.
export const ig2000AssassinSAggressor = {
  cardId: 'ig-2000--assassin-s-aggressor',
  name: "IG-2000, Assassin's Aggressor",
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'space',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-units',
          amount: 1,
          filter: {},
          max: 3,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
