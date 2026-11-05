import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHuyangEnduringInstructor = {
  cardId: 'huyang--enduring-instructor',
  name: 'Huyang, Enduring Instructor',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Jedi', 'Droid'],
  cost: 3,
  unique: true,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'source-in-play',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
