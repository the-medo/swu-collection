import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const gravCharge = {
  cardId: 'grav-charge',
  name: 'Grav Charge',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Condition', 'Item', 'Weapon'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'host-combat-ended',
      timing: 'host-combat-ended',
      effects: [
        {
          kind: 'on-unit',
          target: 'attacker',
          operation: {
            kind: 'damage',
            amount: 4,
          },
        },
        {
          kind: 'defeat-self-upgrade',
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'attached',
        filter: {
          sameAs: 'attacker',
        },
      },
    },
  ],
} as const satisfies UpgradeDefinition;
