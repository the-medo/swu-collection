import type { EventDefinition } from '../definition.ts';

// JTL 076. Printed text is pinned in the meta token fixture.
export const coveringTheWing = {
  cardId: 'covering-the-wing',
  name: 'Covering the Wing',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'x-wing',
      count: 1,
      group: 'created',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            notInGroup: 'created',
          },
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
