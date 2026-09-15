import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-interactions.json.
export const defiantHammerhead = {
  cardId: 'defiant-hammerhead',
  name: 'Defiant Hammerhead',
  kind: 'unit',
  aspects: ['Command', 'Aggression'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 6,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'boost-and-defeat',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'modify',
                    power: 4,
                    hp: 0,
                    duration: 'attack',
                  },
                },
                {
                  kind: 'after-attack',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'defeat',
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
      condition: {
        kind: 'attacking-unit',
        filter: {},
      },
    },
  ],
} as const satisfies UnitDefinition;
