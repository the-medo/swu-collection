import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const houndSToothReliableAndDeadly = {
  cardId: 'hound-s-tooth--reliable-and-deadly',
  name: "Hound's Tooth, Reliable and Deadly",
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'attacking-unit',
        filter: {
          exhausted: true,
          enteredThisPhase: false,
        },
      },
      abilities: {
        firstCombatDamage: true,
      },
    },
  ],
} as const satisfies UnitDefinition;
