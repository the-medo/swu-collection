import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const nimanStrike = {
  cardId: 'niman-strike',
  name: 'Niman Strike',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Learned'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        trait: 'Force',
      },
      bind: 'chosen',
      optional: false,
      forAttack: {
        unitsOnly: true,
        evenIfExhausted: true,
      },
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: 1,
          unitsOnly: true,
          evenIfExhausted: true,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
