import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const warriorSLegacy = {
  cardId: 'warrior-s-legacy',
  name: "Warrior's Legacy",
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Learned'],
  cost: 3,
  token: false,
  modifiers: {
    power: 2,
    hp: 1,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'create-unit',
            cardId: 'mandalorian',
            count: 1,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
