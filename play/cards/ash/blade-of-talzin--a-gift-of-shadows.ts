import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attachment fixture.
export const bladeOfTalzinAGiftOfShadows = {
  cardId: 'blade-of-talzin--a-gift-of-shadows',
  name: 'Blade of Talzin, A Gift of Shadows',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Night', 'Item', 'Weapon'],
  unique: true,
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 1,
  },
  attachTo: 'non-vehicle',
  triggers: [
    {
      id: 'return-to-hand',
      timing: 'defeated',
      effects: [
        {
          kind: 'move-card',
          target: 'source',
          from: 'discard',
          to: 'hand',
          fromPlayer: 'self',
        },
      ],
      condition: {
        kind: 'attached-to-friendly-trait',
        trait: 'Night',
      },
    },
  ],
} as const satisfies UpgradeDefinition;
