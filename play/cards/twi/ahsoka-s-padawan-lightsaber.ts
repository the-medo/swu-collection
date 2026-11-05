import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAhsokaSPadawanLightsaber = {
  cardId: 'ahsoka-s-padawan-lightsaber',
  name: "Ahsoka's Padawan Lightsaber",
  kind: 'upgrade',
  aspects: ['Heroism'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 1,
  token: false,
  modifiers: {
    power: 2,
    hp: 0,
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
              name: 'Ahsoka Tano',
            },
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  optional: false,
                  powerBonus: 0,
                },
              ],
              forAttack: {},
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
