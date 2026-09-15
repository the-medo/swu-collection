import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const yodaSLightsaber = {
  cardId: 'yoda-s-lightsaber',
  name: "Yoda's Lightsaber",
  kind: 'upgrade',
  aspects: ['Command', 'Heroism'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  unique: true,
  cost: 2,
  token: false,
  modifiers: {
    power: 3,
    hp: 1,
  },
  attachTo: 'non-vehicle',
  triggers: [
    {
      id: 'heal-base',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'heal-base',
              amount: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
