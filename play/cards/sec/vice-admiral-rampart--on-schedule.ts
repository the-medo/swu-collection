import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const viceAdmiralRampartOnSchedule = {
  cardId: 'vice-admiral-rampart--on-schedule',
  name: 'Vice Admiral Rampart, On Schedule',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Command', 'Command', 'Villainy'],
          effects: [
            {
              kind: 'select-units',
              filter: {
                otherThan: 'source',
              },
              bind: 'targets',
              max: 2,
              effects: [
                {
                  kind: 'each-unit',
                  filter: {
                    inGroup: 'targets',
                  },
                  bind: 'chosen',
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
