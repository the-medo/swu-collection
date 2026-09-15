import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-sequences.json.
export const letSTalk = {
  cardId: 'let-s-talk',
  name: "Let's Talk",
  kind: 'event',
  aspects: ['Command'],
  traits: ['Trick'],
  cost: 9,
  costReductions: [
    {
      amount: 3,
      condition: {
        kind: 'unit-history-at-least',
        amount: 1,
        event: 'left',
        player: 'self',
      },
    },
  ],
  effects: [
    {
      kind: 'capture-pairs',
    },
  ],
} as const satisfies EventDefinition;
