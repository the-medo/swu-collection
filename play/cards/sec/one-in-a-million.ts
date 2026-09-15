import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-history.json.
export const oneInAMillion = {
  cardId: 'one-in-a-million',
  name: 'One in a Million',
  kind: 'event',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Gambit'],
  cost: 1,
  keywords: ['Plot'],
  cannotPlayFromHand: true,
  effects: [
    {
      kind: 'defeat-unit',
      optional: false,
      filter: {
        powerEquals: {
          kind: 'ready-resources',
          player: 'self',
        },
        remainingHpEquals: {
          kind: 'ready-resources',
          player: 'self',
        },
      },
    },
  ],
} as const satisfies EventDefinition;
