import type { UnitDefinition } from '../definition.ts';

// JTL 143. Printed text is pinned in meta-force-indirect fixture.
export const devastatorHuntingTheRebellion = {
  cardId: 'devastator--hunting-the-rebellion',
  name: 'Devastator, Hunting the Rebellion',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 8,
  power: 9,
  hp: 6,
  arena: 'space',
  assignsOpponentIndirect: true,
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'indirect-damage',
          amount: 4,
          recipient: 'enemy',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
