import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCompassionateSenator = {
  cardId: 'compassionate-senator',
  name: 'Compassionate Senator',
  kind: 'unit',
  aspects: ['Vigilance'],
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
          kind: 'select-target',
          units: {},
          bases: 'any',
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'heal-target',
              target: 'chosen',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
