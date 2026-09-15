import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const dogfight = {
  cardId: 'dogfight',
  name: 'Dogfight',
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
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: 0,
          unitsOnly: true,
          evenIfExhausted: true,
        },
      ],
      forAttack: {
        unitsOnly: true,
        evenIfExhausted: true,
      },
    },
  ],
} as const satisfies EventDefinition;
