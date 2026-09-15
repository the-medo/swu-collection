import type { UnitDefinition } from '../definition.ts';

// LOF 096. Printed text is pinned in meta-board fixture.
export const obiWanKenobiProtectivePadawan = {
  cardId: 'obi-wan-kenobi--protective-padawan',
  name: 'Obi-Wan Kenobi, Protective Padawan',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'on-friendly-played',
      timing: 'friendly-played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'subject',
            filter: {
              trait: 'Force',
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Sentinel'],
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
