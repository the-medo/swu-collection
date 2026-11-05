import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePhaseIiiDarkTrooper = {
  cardId: 'phase-iii-dark-trooper',
  name: 'Phase-III Dark Trooper',
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial', 'Droid', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'friendly-damage-survived',
      timing: 'friendly-damage-survived',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 1,
          },
        },
      ],
      condition: {
        kind: 'all',
        conditions: [
          {
            kind: 'unit-matches',
            target: 'subject',
            filter: {
              sameAs: 'source',
            },
          },
          {
            kind: 'numeric-at-least',
            value: {
              kind: 'value',
              name: 'combat',
            },
            amount: 1,
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
