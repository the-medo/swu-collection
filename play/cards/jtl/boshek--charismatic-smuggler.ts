import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 hidden choices fixture.
export const boshekCharismaticSmuggler = {
  cardId: 'boshek--charismatic-smuggler',
  name: 'BoShek, Charismatic Smuggler',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Pilot'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Cunning'],
    },
  ],
  upgrade: {
    modifiers: {
      power: 1,
      hp: 2,
    },
    attachTo: 'friendly-vehicle-without-pilot',
    triggers: [
      {
        id: 'odd-recovery',
        timing: 'played',
        effects: [
          {
            kind: 'mill',
            player: 'self',
            count: 2,
            bind: 'milled',
            group: 'milled-cards',
            effects: [
              {
                kind: 'move-cards',
                group: 'milled-cards',
                from: 'discard',
                to: 'hand',
                filter: {
                  costParity: 'odd',
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UnitDefinition;
