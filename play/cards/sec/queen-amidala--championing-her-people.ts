import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-prevention fixture.
export const queenAmidalaChampioningHerPeople = {
  cardId: 'queen-amidala--championing-her-people',
  name: 'Queen Amidala, Championing Her People',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Naboo', 'Official'],
  cost: 5,
  power: 5,
  hp: 3,
  arena: 'ground',
  unique: true,
  preventSelfByTraitSacrifice: true,
  triggers: [
    {
      id: 'create-spies',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'spy',
          count: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
