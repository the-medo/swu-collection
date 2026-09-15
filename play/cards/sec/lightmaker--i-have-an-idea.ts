import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const lightmakerIHaveAnIdea = {
  cardId: 'lightmaker--i-have-an-idea',
  name: 'Lightmaker, I Have An Idea',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 4,
  arena: 'space',
  raid: 4,
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'ground',
              effects: [
                {
                  kind: 'select-units',
                  filter: {
                    controller: 'enemy',
                    arena: 'ground',
                  },
                  bind: 'targets',
                  min: {
                    kind: 'unit-count',
                    filter: {
                      controller: 'enemy',
                      arena: 'ground',
                    },
                  },
                  max: {
                    kind: 'unit-count',
                    filter: {
                      controller: 'enemy',
                      arena: 'ground',
                    },
                  },
                  effects: [
                    {
                      kind: 'exhaust-group',
                      group: 'targets',
                    },
                  ],
                },
              ],
            },
            {
              id: 'space',
              effects: [
                {
                  kind: 'select-units',
                  filter: {
                    controller: 'enemy',
                    arena: 'space',
                  },
                  bind: 'targets',
                  min: {
                    kind: 'unit-count',
                    filter: {
                      controller: 'enemy',
                      arena: 'space',
                    },
                  },
                  max: {
                    kind: 'unit-count',
                    filter: {
                      controller: 'enemy',
                      arena: 'space',
                    },
                  },
                  effects: [
                    {
                      kind: 'exhaust-group',
                      group: 'targets',
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
