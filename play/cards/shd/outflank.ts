import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOutflank = {
  cardId: 'outflank',
  name: 'Outflank',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 1,
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
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: 0,
        },
      ],
      forAttack: {},
    },
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: 0,
        },
      ],
      forAttack: {},
    },
  ],
} as const satisfies EventDefinition;
