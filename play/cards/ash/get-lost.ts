import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const getLost = {
  cardId: 'get-lost',
  name: 'Get Lost',
  kind: 'event',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'defeat-unit',
      filter: {
        upgraded: true,
        nonLeader: true,
      },
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
