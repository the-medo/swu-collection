import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const punchIt = {
  cardId: 'punch-it',
  name: 'Punch It',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'attack-with-unit',
      filter: {
        trait: 'Vehicle',
      },
      powerBonus: 2,
    },
  ],
} as const satisfies EventDefinition;
