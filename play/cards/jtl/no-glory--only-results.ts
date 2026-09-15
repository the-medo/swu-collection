import type { EventDefinition } from '../definition.ts';

// JTL 043. Printed text is pinned in meta-continuous fixture.
export const noGloryOnlyResults = {
  cardId: 'no-glory--only-results',
  name: 'No Glory, Only Results',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Tactic'],
  cost: 5,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'take-control',
            player: 'self',
          },
        },
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
} as const satisfies EventDefinition;
