import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const buyTime = {
  cardId: 'buy-time',
  name: 'Buy Time',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'mandalorian',
      count: 1,
      phaseAbilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies EventDefinition;
