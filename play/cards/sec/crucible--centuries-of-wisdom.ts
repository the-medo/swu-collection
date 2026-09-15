import type { UnitDefinition } from '../definition.ts';

// SEC 119. Printed text is pinned in the meta token fixture.
export const crucibleCenturiesOfWisdom = {
  cardId: 'crucible--centuries-of-wisdom',
  name: 'Crucible, Centuries of Wisdom',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Jedi', 'Vehicle', 'Transport'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
