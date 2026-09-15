import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const pointlessToResist = {
  cardId: 'pointless-to-resist',
  name: 'Pointless to Resist',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Condition'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  hostModifiers: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'attached',
        filter: {
          attacking: 'base',
        },
      },
      power: -3,
    },
  ],
} as const satisfies UpgradeDefinition;
