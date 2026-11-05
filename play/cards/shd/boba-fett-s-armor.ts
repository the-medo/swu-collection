import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBobaFettSArmor = {
  cardId: 'boba-fett-s-armor',
  name: "Boba Fett's Armor",
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Item', 'Armor'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  damageReplacements: [
    {
      id: 'armor',
      target: 'attached',
      operation: 'prevent',
      amount: 2,
      condition: {
        kind: 'unit-matches',
        target: 'attached',
        filter: {
          name: 'Boba Fett',
        },
      },
    },
  ],
} as const satisfies UpgradeDefinition;
