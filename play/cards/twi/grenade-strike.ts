import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGrenadeStrike = {
  cardId: 'grenade-strike',
  name: 'Grenade Strike',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'damage-target',
          target: 'chosen',
          amount: 2,
        },
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'chosen',
            sameArenaAs: 'chosen',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
