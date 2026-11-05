import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDisaffectedSenator = {
  cardId: 'disaffected-senator',
  name: 'Disaffected Senator',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Separatist', 'Official'],
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
          bases: 'any',
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
