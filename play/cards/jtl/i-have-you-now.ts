import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const iHaveYouNow = {
  cardId: 'i-have-you-now',
  name: 'I Have You Now',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        trait: 'Vehicle',
      },
      bind: 'attacker',
      optional: false,
      effects: [
        {
          kind: 'attack-bound',
          target: 'attacker',
          optional: false,
          powerBonus: 0,
          preventDamage: true,
        },
      ],
      forAttack: {},
    },
  ],
} as const satisfies EventDefinition;
