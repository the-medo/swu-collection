import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const executorFinalDestructionOfTheAlliance = {
  cardId: 'executor--final-destruction-of-the-alliance',
  name: 'Executor, Final Destruction of the Alliance',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 8,
  power: 5,
  hp: 12,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'unit-sum',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
        },
        stat: 'upgrades',
      },
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'ally',
          effects: [
            {
              kind: 'on-unit',
              target: 'ally',
              operation: {
                kind: 'give-token',
                token: 'advantage',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
