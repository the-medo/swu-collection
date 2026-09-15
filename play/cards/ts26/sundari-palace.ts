import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-resource-repayment.json.
export const sundariPalace = {
  cardId: 'sundari-palace',
  name: 'Sundari Palace',
  kind: 'base',
  aspects: ['Cunning'],
  traits: [],
  hp: 27,
  actions: [
    {
      id: 'epic',
      costs: [],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 0,
          max: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              leader: true,
            },
          },
          bind: 'first',
          group: 'resourced',
          effects: [
            {
              kind: 'resource-cards',
              group: 'resourced',
              ready: true,
              countAs: 'resourced-count',
              effects: [
                {
                  kind: 'schedule-resource-repayment',
                  at: 'regroup',
                  amount: {
                    kind: 'value',
                    name: 'resourced-count',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
