import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const windfall = {
  cardId: 'windfall',
  name: 'Windfall',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Supply'],
  cost: 5,
  effects: [
    {
      kind: 'create-credits',
      amount: 3,
    },
  ],
} as const satisfies EventDefinition;
