import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-prevention fixture.
export const gorianShardSCorsairPirateWarship = {
  cardId: 'gorian-shard-s-corsair--pirate-warship',
  name: "Gorian Shard's Corsair, Pirate Warship",
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 6,
  hp: 5,
  arena: 'space',
  unique: true,
  unpreventableDamageTraits: ['Underworld'],
  triggers: [
    {
      id: 'damage-unit-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-unit',
          amount: 2,
          arena: 'any',
          optional: true,
        },
      ],
    },
    {
      id: 'damage-unit-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'damage-unit',
          amount: 2,
          arena: 'any',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
