import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDengarTheDemolisher = {
  cardId: 'dengar--the-demolisher',
  name: 'Dengar, The Demolisher',
  kind: 'unit',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 1,
  unique: true,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'friendly-card-played',
      timing: 'friendly-card-played',
      effects: [
        {
          kind: 'damage-target',
          target: 'played-host',
          amount: 1,
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'played-host',
        filter: {},
      },
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
