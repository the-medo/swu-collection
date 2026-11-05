import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteValLoyalToTheEnd = {
  cardId: 'val--loyal-to-the-end',
  name: 'Val, Loyal to the End',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Underworld'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 4,
  arena: 'ground',
  bounties: [
    {
      id: 'bounty',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 3,
            },
          ],
        },
      ],
    },
  ],
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
