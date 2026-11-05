import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTripleDarkRaid = {
  cardId: 'triple-dark-raid',
  name: 'Triple Dark Raid',
  kind: 'event',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'search-deck',
      count: 7,
      max: 1,
      filter: 'unit',
      trait: 'Vehicle',
      play: {
        discount: 5,
        ready: true,
        after: [
          {
            kind: 'schedule-return',
            target: 'played',
          },
        ],
      },
    },
  ],
} as const satisfies EventDefinition;
