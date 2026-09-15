import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const rampage = {
  cardId: 'rampage',
  name: 'Rampage',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Innate'],
  cost: 3,
  effects: [
    {
      kind: 'modify-units',
      filter: {
        controller: 'friendly',
        trait: 'Creature',
      },
      operation: {
        kind: 'modify',
        power: 2,
        hp: 2,
        duration: 'phase',
      },
    },
  ],
} as const satisfies EventDefinition;
