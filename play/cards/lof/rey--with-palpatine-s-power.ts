import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-finale.json.
export const reyWithPalpatineSPower = {
  cardId: 'rey--with-palpatine-s-power',
  name: "Rey, With Palpatine's Power",
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi', 'Resistance'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'reveal-drawn-rey',
      timing: 'drawn',
      condition: {
        kind: 'phase',
        phase: 'action',
      },
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'leader-or-base-aspect',
            aspect: 'Aggression',
          },
          effects: [
            {
              kind: 'choose-mode',
              private: true,
              options: [
                {
                  id: 'reveal-rey',
                  effects: [
                    {
                      kind: 'reveal-card',
                      target: 'source',
                      from: 'hand',
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {},
                          bind: 'unit',
                          optional: false,
                          allowMissing: true,
                          effects: [
                            {
                              kind: 'select-target',
                              bases: 'any',
                              bind: 'base',
                              optional: false,
                              effects: [
                                {
                                  kind: 'damage-bound',
                                  targets: ['unit', 'base'],
                                  amount: 2,
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'keep-hidden',
                  effects: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
