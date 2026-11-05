import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBountyPosting = {
  cardId: 'bounty-posting',
  name: 'Bounty Posting',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Plan'],
  cost: 1,
  effects: [
    {
      kind: 'search-deck',
      count: {
        kind: 'zone-size',
        zone: 'deck',
        player: 'self',
      },
      max: 1,
      filter: 'upgrade',
      trait: 'Bounty',
      bind: 'selected',
      after: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'upgrade',
          },
          optional: true,
          target: 'selected',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
