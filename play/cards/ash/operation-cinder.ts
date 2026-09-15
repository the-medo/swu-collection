import type { EventDefinition } from '../definition.ts';

// ASH . V8 rules; printed text pinned in meta combat fixture.
export const operationCinder = {
  cardId: 'operation-cinder',
  name: 'Operation Cinder',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Disaster', 'Plan'],
  cost: 6,
  effects: [
    {
      kind: 'damage-own-base',
      amount: 5,
    },
    {
      kind: 'damage-units',
      filter: {},
      amount: 5,
    },
  ],
} as const satisfies EventDefinition;
