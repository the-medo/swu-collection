import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const restoreFreedom = {
  cardId: 'restore-freedom',
  name: 'Restore Freedom',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Gambit'],
  cost: 2,
  effects: [
    {
      kind: 'play-card',
      from: 'hand',
      filter: {
        kind: 'unit',
      },
      optional: false,
      discount: {
        kind: 'unit-aspect-icons',
        aspect: 'Heroism',
        filter: {
          controller: 'friendly',
        },
      },
    },
  ],
} as const satisfies EventDefinition;
