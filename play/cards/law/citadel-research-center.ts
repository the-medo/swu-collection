import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-choices.json.
export const citadelResearchCenter = {
  cardId: 'citadel-research-center',
  name: 'Citadel Research Center',
  kind: 'base',
  aspects: ['Cunning'],
  traits: [],
  hp: 26,
  actions: [
    {
      id: 'epic',
      costs: [
        {
          kind: 'resources',
          amount: 1,
        },
      ],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'resources',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 1,
          max: 1,
          bind: 'resource',
          effects: [
            {
              kind: 'move-card',
              target: 'resource',
              from: 'resources',
              to: 'hand',
              effects: [
                {
                  kind: 'resource-top',
                  optional: false,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
