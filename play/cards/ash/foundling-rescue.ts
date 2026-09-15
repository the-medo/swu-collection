import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const foundlingRescue = {
  cardId: 'foundling-rescue',
  name: 'Foundling Rescue',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Plan'],
  cost: 4,
  effects: [
    {
      kind: 'defeat-unit',
      filter: {
        remainingHpAtMost: 2,
      },
      optional: true,
    },
    {
      kind: 'create-unit',
      cardId: 'mandalorian',
      count: 1,
    },
  ],
} as const satisfies EventDefinition;
