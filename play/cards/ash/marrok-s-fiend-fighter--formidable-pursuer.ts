import type { UnitDefinition } from '../definition.ts';

// ASH 241. Printed text is pinned in the meta token fixture.
export const marrokSFiendFighterFormidablePursuer = {
  cardId: 'marrok-s-fiend-fighter--formidable-pursuer',
  name: "Marrok's Fiend Fighter, Formidable Pursuer",
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Vehicle', 'Fighter'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'space',
  keywords: ['Support', 'Overwhelm'],
  constant: [
    {
      condition: {
        kind: 'attacking-damaged-unit',
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
