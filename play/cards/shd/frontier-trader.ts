import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFrontierTrader = {
  cardId: 'frontier-trader',
  name: 'Frontier Trader',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Jawa'],
  cost: 3,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'resources',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 0,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'move-card',
              target: 'card',
              from: 'resources',
              to: 'hand',
              effects: [
                {
                  kind: 'resource-top',
                  optional: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
