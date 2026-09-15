import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 hidden choices fixture.
export const ebonHawkCauseAndEffect = {
  cardId: 'ebon-hawk--cause-and-effect',
  name: 'Ebon Hawk, Cause and Effect',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Vehicle', 'Transport'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'disclose-combat',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'decline',
              effects: [],
            },
            {
              id: 'heroism',
              effects: [
                {
                  kind: 'disclose',
                  aspects: ['Heroism'],
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'modify',
                        power: 2,
                        hp: 0,
                        duration: 'attack',
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'villainy',
              effects: [
                {
                  kind: 'disclose',
                  aspects: ['Villainy'],
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'defender',
                      operation: {
                        kind: 'modify',
                        power: -4,
                        hp: 0,
                        duration: 'attack',
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'both',
              effects: [
                {
                  kind: 'disclose',
                  aspects: ['Heroism', 'Villainy'],
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'modify',
                        power: 2,
                        hp: 0,
                        duration: 'attack',
                      },
                    },
                    {
                      kind: 'on-unit',
                      target: 'defender',
                      operation: {
                        kind: 'modify',
                        power: -4,
                        hp: 0,
                        duration: 'attack',
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
