import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteForACauseIBelieveIn = {
  cardId: 'for-a-cause-i-believe-in',
  name: 'For a Cause I Believe In',
  kind: 'event',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Innate'],
  cost: 3,
  effects: [
    {
      kind: 'reveal-deck-cards',
      player: 'self',
      count: 4,
      group: 'revealed',
      effects: [
        {
          kind: 'damage-target',
          target: 'enemy-base',
          amount: {
            kind: 'group-size',
            group: 'revealed',
            filter: {
              aspect: 'Heroism',
            },
          },
        },
        {
          kind: 'look-deck',
          count: 4,
          mode: 'discard-any',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
