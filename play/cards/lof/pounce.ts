import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const pounce = {
  cardId: 'pounce',
  name: 'Pounce',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'attack-with-unit',
      filter: {
        trait: 'Creature',
      },
      powerBonus: 4,
    },
  ],
} as const satisfies EventDefinition;
