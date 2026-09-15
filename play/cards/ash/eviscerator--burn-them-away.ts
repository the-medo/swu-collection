import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 phase history and tokens fixture.
export const evisceratorBurnThemAway = {
  cardId: 'eviscerator--burn-them-away',
  name: 'Eviscerator, Burn Them Away',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 8,
  power: 9,
  hp: 7,
  arena: 'space',
  blankFriendlyAdvantages: true,
  triggers: [
    {
      id: 'advantage-played',
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
                token: 'advantage',
                count: 2,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'advantage-attack',
      timing: 'attack',
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
                token: 'advantage',
                count: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
