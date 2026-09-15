import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const staccatoLightningRepeater = {
  cardId: '-staccato-lightning--repeater',
  name: '“Staccato Lightning” Repeater',
  kind: 'upgrade',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Item', 'Weapon'],
  cost: 3,
  token: false,
  modifiers: {
    power: 3,
    hp: 1,
  },
  attachTo: 'non-vehicle',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-units',
          amount: 1,
          filter: {
            arena: 'ground',
          },
          max: 3,
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
