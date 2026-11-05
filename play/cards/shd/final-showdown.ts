import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFinalShowdown = {
  cardId: 'final-showdown',
  name: 'Final Showdown',
  kind: 'event',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Gambit'],
  cost: 6,
  effects: [
    {
      kind: 'ready-units',
      filter: {
        controller: 'friendly',
      },
    },
    {
      kind: 'schedule-regroup-effects',
      effects: [
        {
          kind: 'lose-game',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
