import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHeadhunting = {
  cardId: 'headhunting',
  name: 'Headhunting',
  kind: 'event',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: true,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: {
            kind: 'conditional',
            condition: {
              kind: 'unit-matches',
              target: 'chosen',
              filter: {
                trait: 'Bounty Hunter',
              },
            },
            then: 2,
            otherwise: 0,
          },
          unitsOnly: true,
        },
      ],
      forAttack: {
        unitsOnly: true,
      },
    },
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: true,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: {
            kind: 'conditional',
            condition: {
              kind: 'unit-matches',
              target: 'chosen',
              filter: {
                trait: 'Bounty Hunter',
              },
            },
            then: 2,
            otherwise: 0,
          },
          unitsOnly: true,
        },
      ],
      forAttack: {
        unitsOnly: true,
      },
    },
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: true,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: {
            kind: 'conditional',
            condition: {
              kind: 'unit-matches',
              target: 'chosen',
              filter: {
                trait: 'Bounty Hunter',
              },
            },
            then: 2,
            otherwise: 0,
          },
          unitsOnly: true,
        },
      ],
      forAttack: {
        unitsOnly: true,
      },
    },
  ],
} as const satisfies EventDefinition;
