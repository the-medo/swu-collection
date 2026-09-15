import type { EventDefinition } from '../definition.ts';

// SEC 092. Printed text is pinned in the meta token fixture.
export const iAmTheSenate = {
  cardId: 'i-am-the-senate',
  name: 'I Am the Senate',
  kind: 'event',
  aspects: ['Command', 'Villainy'],
  traits: ['Law'],
  cost: 6,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'spy',
      count: 5,
    },
  ],
} as const satisfies EventDefinition;
