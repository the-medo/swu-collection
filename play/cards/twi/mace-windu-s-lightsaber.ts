import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMaceWinduSLightsaber = {
  cardId: 'mace-windu-s-lightsaber',
  name: "Mace Windu's Lightsaber",
  kind: 'upgrade',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'attached',
            filter: {
              name: 'Mace Windu',
            },
          },
          effects: [
            {
              kind: 'draw-cards',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
