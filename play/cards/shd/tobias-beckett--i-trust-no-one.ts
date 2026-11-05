import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTobiasBeckettITrustNoOne = {
  cardId: 'tobias-beckett--i-trust-no-one',
  name: 'Tobias Beckett, I Trust No One',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 5,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 5,
      aspects: ['Vigilance'],
    },
  ],
  triggers: [
    {
      id: 'friendly-card-played',
      timing: 'friendly-card-played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            maxCost: {
              kind: 'card-cost',
              target: 'subject',
            },
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
      limit: 'once-per-round',
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: {
          notKind: 'unit',
        },
      },
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
