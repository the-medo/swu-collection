import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const jediTrials = {
  cardId: 'jedi-trials',
  name: 'Jedi Trials',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Jedi', 'Learned'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  attachFilter: {
    trait: 'Force',
  },
  grants: {
    triggers: [
      {
        id: 'training',
        timing: 'attack',
        effects: [
          {
            kind: 'on-unit',
            target: 'source',
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
  conditionalHostTraits: [
    {
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'upgrades-count',
          target: 'source',
        },
        amount: 4,
      },
      traits: ['Jedi'],
    },
  ],
} as const satisfies UpgradeDefinition;
