import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGrimResolve = {
  cardId: 'grim-resolve',
  name: 'Grim Resolve',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        nonLeader: true,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: 0,
          abilities: {
            keywords: ['Grit'],
          },
        },
      ],
      forAttack: {},
    },
  ],
} as const satisfies EventDefinition;
