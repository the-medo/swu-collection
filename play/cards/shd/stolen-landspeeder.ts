import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteStolenLandspeeder = {
  cardId: 'stolen-landspeeder',
  name: 'Stolen Landspeeder',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Vehicle', 'Speeder'],
  cost: 1,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'take-control',
            player: 'enemy',
          },
        },
      ],
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'value',
          name: 'played-from-hand',
        },
        amount: 1,
      },
    },
  ],
  bounties: [
    {
      id: 'bounty',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'card-matches',
            target: 'source',
            filter: {
              owner: 'self',
            },
          },
          effects: [
            {
              kind: 'play-card',
              from: 'discard',
              filter: {
                kind: 'unit',
              },
              optional: false,
              target: 'source',
              free: true,
              bind: 'played',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'played',
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
    },
  ],
} as const satisfies UnitDefinition;
