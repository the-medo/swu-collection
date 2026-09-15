import type { EventDefinition } from '../definition.ts';

// JTL . V8 rules; printed text pinned in meta combat fixture.
export const nebulaIgnition = {
  cardId: 'nebula-ignition',
  name: 'Nebula Ignition',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Disaster'],
  cost: 9,
  effects: [
    {
      kind: 'defeat-units',
      filter: {
        upgraded: false,
      },
    },
  ],
} as const satisfies EventDefinition;
