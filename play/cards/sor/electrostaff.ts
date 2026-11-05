import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteElectrostaff = {
  cardId: 'electrostaff',
  name: 'Electrostaff',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Item', 'Weapon'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  auras: [
    {
      id: 'aura',
      filter: {
        attackingAgainst: {
          sameAs: 'attached',
        },
      },
      power: -1,
    },
  ],
} as const satisfies UpgradeDefinition;
