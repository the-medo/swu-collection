import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTwiceThePride = {
  cardId: 'twice-the-pride',
  name: 'Twice the Pride',
  kind: 'upgrade',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Innate'],
  cost: 2,
  token: false,
  modifiers: {
    power: 4,
    hp: 0,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-target',
          target: 'attached',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
