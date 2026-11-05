import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOutmaneuver = {
  cardId: 'outmaneuver',
  name: 'Outmaneuver',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'ground',
          effects: [
            {
              kind: 'exhaust-units',
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
              kind: 'exhaust-units',
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
