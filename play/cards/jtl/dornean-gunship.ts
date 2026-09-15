import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const dorneanGunship = {
  cardId: 'dornean-gunship',
  name: 'Dornean Gunship',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'indirect',
      timing: 'played',
      effects: [
        {
          kind: 'indirect-damage',
          amount: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              trait: 'Vehicle',
            },
          },
          recipient: 'chosen',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
