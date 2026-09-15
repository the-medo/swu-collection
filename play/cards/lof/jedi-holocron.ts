import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const jediHolocron = {
  cardId: 'jedi-holocron',
  name: 'Jedi Holocron',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Jedi', 'Item'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  attachFilter: {
    trait: 'Force',
  },
  grants: {
    triggers: [
      {
        id: 'heal-another',
        timing: 'attack',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              otherThan: 'source',
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'heal',
                  amount: 3,
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
