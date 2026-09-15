import type { UnitDefinition } from '../definition.ts';

// JTL . Printed text is pinned in the meta effects fixture.
export const crackshotVWing = {
  cardId: 'crackshot-v-wing',
  name: 'Crackshot V-Wing',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-most',
            amount: 0,
            filter: {
              controller: 'friendly',
              trait: 'Fighter',
              otherThan: 'source',
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
