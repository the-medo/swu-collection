import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-allocations.json.
export const theSarlaccOfCarkoonHorrorOfTheDuneSea = {
  cardId: 'the-sarlacc-of-carkoon--horror-of-the-dune-sea',
  name: 'The Sarlacc of Carkoon, Horror of the Dune Sea',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Creature'],
  unique: true,
  cost: 8,
  power: 8,
  hp: 9,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'self',
          filter: {
            kind: 'unit',
          },
          min: 1,
          max: 1,
          bind: 'returned',
          effects: [
            {
              kind: 'move-card',
              target: 'returned',
              from: 'discard',
              to: 'deck-bottom',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                    arena: 'ground',
                  },
                  bind: 'victim',
                  optional: false,
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'victim',
                      amount: {
                        kind: 'printed-stat',
                        target: 'returned',
                        stat: 'power',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
