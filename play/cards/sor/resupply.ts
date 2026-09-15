import type { EventDefinition } from '../definition.ts';

// SOR . V8 rules; printed text pinned in meta combat fixture.
export const resupply = {
  cardId: 'resupply',
  name: 'Resupply',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Supply'],
  cost: 3,
  effects: [
    {
      kind: 'self-resource',
      ready: false,
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
