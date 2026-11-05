import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCornerThePrey = {
  cardId: 'corner-the-prey',
  name: 'Corner the Prey',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
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
          powerBonus: {
            kind: 'unit-stat',
            target: 'defender',
            stat: 'damage',
          },
        },
      ],
      forAttack: {},
    },
  ],
} as const satisfies EventDefinition;
