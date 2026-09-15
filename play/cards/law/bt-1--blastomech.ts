import type { UnitDefinition } from '../definition.ts';

// LAW 173. Printed text is pinned in meta-hidden-zones fixture.
export const bt1Blastomech = {
  cardId: 'bt-1--blastomech',
  name: 'BT-1, Blastomech',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Droid'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'mill',
          player: 'self',
          count: 1,
          bind: 'milled',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'card-matches',
                target: 'milled',
                filter: {
                  aspect: 'Aggression',
                },
              },
              effects: [
                {
                  kind: 'damage-unit',
                  amount: 1,
                  optional: true,
                  arena: 'ground',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
