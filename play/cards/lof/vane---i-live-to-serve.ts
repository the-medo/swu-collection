import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const vaneILiveToServe = {
  cardId: 'vane---i-live-to-serve',
  name: 'Vaneé, I Live to Serve',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Sith', 'Official'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'transfer-on-play',
      timing: 'played',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            controller: 'friendly',
            cardId: 'experience',
          },
          min: 0,
          max: 1,
          bind: 'experience',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'experience',
              to: 'discard',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 1,
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
    {
      id: 'transfer-on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            controller: 'friendly',
            cardId: 'experience',
          },
          min: 0,
          max: 1,
          bind: 'experience',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'experience',
              to: 'discard',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 1,
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
