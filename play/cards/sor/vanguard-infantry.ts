import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVanguardInfantry = {
  cardId: 'vanguard-infantry',
  name: 'Vanguard Infantry',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Trooper'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
