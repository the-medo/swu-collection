import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-final.json.
export const fireAcrossTheGalaxy = {
  cardId: 'fire-across-the-galaxy',
  name: 'Fire Across the Galaxy',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Spectre'],
  cost: 6,
  effects: [
    {
      kind: 'use-played-abilities',
      filter: {
        controller: 'friendly',
        trait: 'Spectre',
      },
    },
  ],
} as const satisfies EventDefinition;
