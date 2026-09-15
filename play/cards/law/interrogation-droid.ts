import type { UnitDefinition } from '../definition.ts';

// LAW 075. Printed text is pinned in meta-hidden-zones fixture.
export const interrogationDroid = {
  cardId: 'interrogation-droid',
  name: 'Interrogation Droid',
  kind: 'unit',
  aspects: ['Aggression', 'Cunning', 'Villainy'],
  traits: ['Imperial', 'Droid'],
  cost: 2,
  power: 3,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
              ifYouDo: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'unit-matches',
                    target: 'chosen',
                    filter: {
                      maxCost: 3,
                    },
                  },
                  effects: [
                    {
                      kind: 'inspect-zone',
                      zone: 'hand',
                      player: 'enemy',
                      chooser: 'owner',
                      filter: {},
                      min: 1,
                      max: 1,
                      bind: 'chosen-card',
                      effects: [
                        {
                          kind: 'move-card',
                          discardBy: 'owner',
                          target: 'chosen-card',
                          from: 'hand',
                          to: 'discard',
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
    },
  ],
} as const satisfies UnitDefinition;
