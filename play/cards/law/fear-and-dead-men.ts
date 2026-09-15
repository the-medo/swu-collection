import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const fearAndDeadMen = {
  cardId: 'fear-and-dead-men',
  name: 'Fear and Dead Men',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Tactic'],
  cost: 7,
  costReductions: [
    {
      condition: {
        kind: 'always',
      },
      amount: {
        kind: 'phase-count',
        event: 'hand-cards-discarded',
        player: 'self',
      },
    },
  ],
  effects: [
    {
      kind: 'damage-units',
      amount: 4,
      filter: {
        controller: 'enemy',
        arena: 'ground',
      },
      mandatory: true,
    },
  ],
} as const satisfies EventDefinition;
