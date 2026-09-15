import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const targetingComputer = {
  cardId: 'targeting-computer',
  name: 'Targeting Computer',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Item', 'Modification'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  grants: {
    assignsOwnIndirect: true,
  },
} as const satisfies UpgradeDefinition;
