import type { EventDefinition } from '../definition.ts';

// LOF . V8 rules; printed text pinned in meta combat fixture.
export const crushingBlow = {
  cardId: 'crushing-blow',
  name: 'Crushing Blow',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'defeat-unit',
      filter: {
        nonLeader: true,
        maxCost: 2,
      },
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
