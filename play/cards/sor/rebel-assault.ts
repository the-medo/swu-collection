import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRebelAssault = {
  cardId: 'rebel-assault',
  name: 'Rebel Assault',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        trait: 'Rebel',
      },
      optional: false,
      bind: 'first',
      effects: [
        {
          kind: 'attack-bound',
          target: 'first',
          optional: false,
          powerBonus: 1,
        },
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Rebel',
            otherThan: 'first',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              powerBonus: 1,
            },
          ],
          forAttack: {},
        },
      ],
      forAttack: {},
      allowMissing: true,
    },
  ],
} as const satisfies EventDefinition;
