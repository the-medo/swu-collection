import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOnTheDoorstep = {
  cardId: 'on-the-doorstep',
  name: 'On the Doorstep',
  kind: 'event',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Supply'],
  cost: 4,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'battle-droid',
      count: 3,
      group: 'droids',
      effects: [
        {
          kind: 'ready-units',
          filter: {
            inGroup: 'droids',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
