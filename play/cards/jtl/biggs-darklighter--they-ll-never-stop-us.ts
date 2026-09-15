import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const biggsDarklighterTheyLlNeverStopUs = {
  cardId: 'biggs-darklighter--they-ll-never-stop-us',
  name: "Biggs Darklighter, They'll Never Stop Us",
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Pilot'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 1,
      aspects: ['Aggression', 'Heroism'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 2,
      hp: 1,
    },
    grants: {
      constant: [
        {
          condition: {
            kind: 'unit-matches',
            target: 'source',
            filter: {
              trait: 'Fighter',
            },
          },
          abilities: {
            keywords: ['Overwhelm'],
          },
        },
        {
          condition: {
            kind: 'unit-matches',
            target: 'source',
            filter: {
              trait: 'Speeder',
            },
          },
          abilities: {
            keywords: ['Grit'],
          },
        },
      ],
    },
    hostModifiers: [
      {
        condition: {
          kind: 'unit-matches',
          target: 'attached',
          filter: {
            trait: 'Transport',
          },
        },
        hp: 1,
      },
    ],
  },
} as const satisfies UnitDefinition;
