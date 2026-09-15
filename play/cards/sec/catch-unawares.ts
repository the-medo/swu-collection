import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const catchUnawares = {
  cardId: 'catch-unawares',
  name: 'Catch Unawares',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 2,
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
          defenderPowerModifier: -4,
        },
      ],
      forAttack: {},
    },
  ],
} as const satisfies EventDefinition;
