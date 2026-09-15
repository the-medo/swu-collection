import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const clandestineConnections = {
  cardId: 'clandestine-connections',
  name: 'Clandestine Connections',
  kind: 'upgrade',
  aspects: [],
  traits: ['Supply'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'pay',
            costs: [
              {
                kind: 'resources',
                amount: 2,
              },
            ],
            optional: true,
            effects: [
              {
                kind: 'select-target',
                bases: 'any',
                bind: 'base',
                optional: false,
                effects: [
                  {
                    kind: 'damage-target',
                    target: 'base',
                    amount: 2,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
