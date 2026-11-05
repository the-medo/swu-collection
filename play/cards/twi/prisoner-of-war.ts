import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePrisonerOfWar = {
  cardId: 'prisoner-of-war',
  name: 'Prisoner of War',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'guard',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            withoutTrait: 'Vehicle',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'capture-unit',
              guard: 'guard',
              target: 'chosen',
            },
            {
              kind: 'if',
              condition: {
                kind: 'numeric-greater',
                left: {
                  kind: 'card-cost',
                  target: 'guard',
                },
                right: {
                  kind: 'card-cost',
                  target: 'chosen',
                },
              },
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'battle-droid',
                  count: 2,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
