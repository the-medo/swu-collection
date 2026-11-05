import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDesperateAttack = {
  cardId: 'desperate-attack',
  name: 'Desperate Attack',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        damaged: true,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: 2,
        },
      ],
      forAttack: {},
    },
  ],
} as const satisfies EventDefinition;
