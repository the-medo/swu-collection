import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheInvisibleHandImposingFlagship = {
  cardId: 'the-invisible-hand--imposing-flagship',
  name: 'The Invisible Hand, Imposing Flagship',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Separatist', 'Vehicle', 'Capital Ship'],
  cost: 8,
  unique: true,
  power: 4,
  hp: 7,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'battle-droid',
          count: 4,
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-units',
          filter: {
            controller: 'friendly',
            trait: 'Separatist',
            exhausted: false,
          },
          bind: 'chosen',
          min: 0,
          max: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              trait: 'Separatist',
              exhausted: false,
            },
          },
          effects: [
            {
              kind: 'exhaust-group',
              group: 'chosen',
              countAs: 'exhausted',
              effects: [
                {
                  kind: 'select-target',
                  bases: 'enemy',
                  bind: 'base',
                  optional: false,
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'base',
                      amount: {
                        kind: 'value',
                        name: 'exhausted',
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
