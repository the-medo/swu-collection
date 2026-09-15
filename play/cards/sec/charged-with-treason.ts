import type { EventDefinition } from '../definition.ts';

// SEC 182. Printed text and rulings are pinned in meta-disclose fixture.
export const chargedWithTreason = {
  cardId: 'charged-with-treason',
  name: 'Charged with Treason',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Law'],
  cost: 4,
  effects: [
    {
      kind: 'disclose',
      aspects: ['Aggression', 'Aggression'],
      effects: [
        {
          kind: 'damage-unit',
          arena: 'any',
          amount: 5,
          optional: false,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
