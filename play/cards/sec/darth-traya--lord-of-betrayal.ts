import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const darthTrayaLordOfBetrayal = {
  cardId: 'darth-traya--lord-of-betrayal',
  name: 'Darth Traya, Lord of Betrayal',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force', 'Sith'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'ready-leader',
      timing: 'attack',
      effects: [
        {
          kind: 'ready-leader',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
