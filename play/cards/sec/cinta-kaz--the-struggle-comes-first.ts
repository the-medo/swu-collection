import type { UnitDefinition } from '../definition.ts';

// SEC 172. Printed text is pinned in meta-plot fixture.
export const cintaKazTheStruggleComesFirst = {
  cardId: 'cinta-kaz--the-struggle-comes-first',
  name: 'Cinta Kaz, The Struggle Comes First',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel'],
  cost: 6,
  keywords: ['Plot'],
  power: 5,
  hp: 5,
  arena: 'ground',
  unique: true,
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          forAttack: {},
          filter: {
            controller: 'friendly',
            exhausted: false,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
