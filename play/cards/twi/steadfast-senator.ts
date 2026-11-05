import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSteadfastSenator = {
  cardId: 'steadfast-senator',
  name: 'Steadfast Senator',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Official'],
  cost: 1,
  power: 0,
  hp: 4,
  arena: 'ground',
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'resources',
          amount: 2,
        },
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
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
              powerBonus: 2,
            },
          ],
          forAttack: {},
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
