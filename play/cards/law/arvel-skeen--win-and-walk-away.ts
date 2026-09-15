import type { UnitDefinition } from '../definition.ts';

// Printed text is pinned in the meta-credits fixture.
export const arvelSkeenWinAndWalkAway = {
  cardId: 'arvel-skeen--win-and-walk-away',
  name: 'Arvel Skeen, Win and Walk Away',
  aspects: ['Aggression'],
  traits: ['Rebel'],
  kind: 'unit',
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  unique: true,
  triggers: [
    {
      id: 'credit-played',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-credit',
          controller: 'any',
          optional: true,
          effects: [
            {
              kind: 'select-target',
              units: {},
              bases: 'any',
              bind: 'victim',
              optional: false,
              effects: [
                {
                  kind: 'damage-target',
                  target: 'victim',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'credit-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'defeat-credit',
          controller: 'any',
          optional: true,
          effects: [
            {
              kind: 'select-target',
              units: {},
              bases: 'any',
              bind: 'victim',
              optional: false,
              effects: [
                {
                  kind: 'damage-target',
                  target: 'victim',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
