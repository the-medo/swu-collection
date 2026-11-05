import type { UpgradeDefinition } from '../definition.ts';

// Reprinted in IC27 085; identity and text follow the official catalog.
export const ic27ReprintInspiringMentor = {
  cardId: 'inspiring-mentor',
  name: 'Inspiring Mentor',
  kind: 'upgrade',
  aspects: ['Command', 'Heroism'],
  traits: ['Innate'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'non-vehicle',
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'friendly',
              otherThan: 'source',
            },
            bind: 'chosen',
            optional: false,
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
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'friendly',
              otherThan: 'source',
            },
            bind: 'chosen',
            optional: false,
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
  },
} as const satisfies UpgradeDefinition;
