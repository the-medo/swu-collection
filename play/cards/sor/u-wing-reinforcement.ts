import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteUWingReinforcement = {
  cardId: 'u-wing-reinforcement',
  name: 'U-Wing Reinforcement',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Supply'],
  cost: 7,
  effects: [
    {
      kind: 'search-deck',
      count: 10,
      max: 3,
      filter: 'unit',
      maxTotalCost: 7,
      play: {
        discount: 0,
        free: true,
      },
    },
  ],
} as const satisfies EventDefinition;
