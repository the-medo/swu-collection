import type { EventDefinition } from '../definition.ts';

// JTL . V8 rules; printed text pinned in meta combat fixture.
export const directHit = {
  cardId: 'direct-hit',
  name: 'Direct Hit',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'defeat-unit',
      filter: {
        nonLeader: true,
        trait: 'Vehicle',
      },
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
