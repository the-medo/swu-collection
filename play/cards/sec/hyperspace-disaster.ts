import type { EventDefinition } from '../definition.ts';

// SEC . V8 rules; printed text pinned in meta combat fixture.
export const hyperspaceDisaster = {
  cardId: 'hyperspace-disaster',
  name: 'Hyperspace Disaster',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Disaster'],
  cost: 7,
  effects: [
    {
      kind: 'defeat-units',
      filter: {
        arena: 'space',
      },
    },
  ],
} as const satisfies EventDefinition;
