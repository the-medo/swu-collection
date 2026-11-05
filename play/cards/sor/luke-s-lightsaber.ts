import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLukeSLightsaber = {
  cardId: 'luke-s-lightsaber',
  name: "Luke's Lightsaber",
  kind: 'upgrade',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 2,
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
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'attached',
            filter: {
              name: 'Luke Skywalker',
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'attached',
              operation: {
                kind: 'heal',
                amount: 'all',
              },
            },
            {
              kind: 'on-unit',
              target: 'attached',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
