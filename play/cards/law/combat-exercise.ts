import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const combatExercise = {
  cardId: 'combat-exercise',
  name: 'Combat Exercise',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Learned'],
  cost: 1,
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
            kind: 'exhaust',
          },
          ifYouDo: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
