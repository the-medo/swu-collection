import type { UnitDefinition } from '../definition.ts';

// SEC 082. Printed text is pinned in meta-plot fixture.
export const chancellorPalpatineIAmTheSenate = {
  cardId: 'chancellor-palpatine--i-am-the-senate',
  name: 'Chancellor Palpatine, I Am the Senate',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Republic', 'Official'],
  cost: 3,
  keywords: ['Plot'],
  power: 2,
  hp: 2,
  arena: 'ground',
  unique: true,
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              leader: true,
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'create-unit',
              cardId: 'spy',
              count: 2,
              phaseAbilities: {
                keywords: ['Sentinel'],
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
