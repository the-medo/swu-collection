import type { UnitDefinition } from '../definition.ts';

// ASH . Printed text is pinned in the meta effects fixture.
export const theCyborgMechMysteriousThreat = {
  cardId: 'the-cyborg-mech--mysterious-threat',
  name: 'The Cyborg Mech, Mysterious Threat',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Fringe'],
  unique: true,
  cost: 6,
  power: 3,
  hp: 7,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'damage-an-undamaged-unit',
              effects: [
                {
                  kind: 'select-unit',
                  bind: 'chosen',
                  filter: {
                    arena: 'ground',
                    damaged: false,
                  },
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 2,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'damage-a-damaged-unit',
              effects: [
                {
                  kind: 'select-unit',
                  bind: 'chosen',
                  filter: {
                    arena: 'ground',
                    damaged: true,
                  },
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 5,
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
