import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-phase.json.
export const theConflictWithin = {
  cardId: 'the-conflict-within',
  name: 'The Conflict Within',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Condition'],
  cost: 3,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'ready-payment',
        timing: 'readied',
        effects: [
          {
            kind: 'pay',
            costs: [
              {
                kind: 'resources',
                amount: 3,
              },
            ],
            optional: true,
            effects: [],
            otherwise: [
              {
                kind: 'on-unit',
                target: 'source',
                operation: {
                  kind: 'exhaust',
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
