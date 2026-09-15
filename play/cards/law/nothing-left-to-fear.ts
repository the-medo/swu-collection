import type { EventDefinition } from '../definition.ts';

// LAW 041. Printed text is pinned in meta-board fixture.
export const nothingLeftToFear = {
  cardId: 'nothing-left-to-fear',
  name: 'Nothing Left to Fear',
  kind: 'event',
  aspects: ['Vigilance', 'Command'],
  traits: ['Innate'],
  cost: 5,
  effects: [
    {
      kind: 'select-unit',
      bind: 'ally',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'ally',
          operation: {
            kind: 'modify',
            power: 2,
            hp: 2,
            duration: 'phase',
          },
        },
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            nonLeader: true,
            powerAtMostUnit: 'ally',
          },
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
