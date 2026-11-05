import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheDarksaber = {
  cardId: 'the-darksaber',
  name: 'The Darksaber',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Mandalorian', 'Item', 'Weapon'],
  cost: 4,
  token: false,
  modifiers: {
    power: 4,
    hp: 3,
  },
  attachTo: 'non-vehicle',
  ownPlayAspectExceptions: [
    {
      host: {
        trait: 'Mandalorian',
      },
    },
  ],
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'each-unit',
            filter: {
              controller: 'friendly',
              trait: 'Mandalorian',
              otherThan: 'source',
            },
            bind: 'recipient',
            effects: [
              {
                kind: 'on-unit',
                target: 'recipient',
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
