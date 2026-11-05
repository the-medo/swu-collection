import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBombingRun = {
  cardId: 'bombing-run',
  name: 'Bombing Run',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 5,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'ground',
          effects: [
            {
              kind: 'damage-units',
              amount: 3,
              filter: {
                arena: 'ground',
              },
            },
          ],
        },
        {
          id: 'space',
          effects: [
            {
              kind: 'damage-units',
              amount: 3,
              filter: {
                arena: 'space',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
