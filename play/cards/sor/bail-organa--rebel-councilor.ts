import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBailOrganaRebelCouncilor = {
  cardId: 'bail-organa--rebel-councilor',
  name: 'Bail Organa, Rebel Councilor',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Official'],
  cost: 1,
  unique: true,
  power: 1,
  hp: 2,
  arena: 'ground',
  actions: [
    {
      id: 'action',
      costs: [
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
            otherThan: 'source',
          },
          optional: false,
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
