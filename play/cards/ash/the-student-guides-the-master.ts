import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const theStudentGuidesTheMaster = {
  cardId: 'the-student-guides-the-master',
  name: 'The Student Guides the Master',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Learned'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: {
              kind: 'unit-count',
              filter: {
                controller: 'friendly',
                otherThan: 'chosen',
                powerLessThan: 'chosen',
              },
            },
            hp: 0,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
