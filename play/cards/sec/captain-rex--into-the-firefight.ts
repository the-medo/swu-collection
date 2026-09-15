import type { UnitDefinition } from '../definition.ts';

// Catalog text is pinned in meta-post-search; updated end-of-attack timing is documented.
export const captainRexIntoTheFirefight = {
  cardId: 'captain-rex--into-the-firefight',
  name: 'Captain Rex, Into the Firefight',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 6,
  kind: 'unit',
  power: 7,
  hp: 7,
  arena: 'ground',
  unique: true,
  triggers: [
    {
      id: 'give-sentinel',
      timing: 'played',
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
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'enemy',
          optional: false,
          allowMissing: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'enemy',
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
    {
      id: 'end-sentinel',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'survived',
            amount: 1,
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
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
              },
              bind: 'enemy',
              optional: false,
              allowMissing: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'enemy',
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
    },
  ],
} as const satisfies UnitDefinition;
