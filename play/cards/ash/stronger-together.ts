import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const strongerTogether = {
  cardId: 'stronger-together',
  name: 'Stronger Together',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Learned'],
  cost: 4,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'mandalorian',
      count: 2,
    },
  ],
} as const satisfies EventDefinition;
