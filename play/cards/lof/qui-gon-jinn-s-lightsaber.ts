import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const quiGonJinnSLightsaber = {
  cardId: 'qui-gon-jinn-s-lightsaber',
  name: "Qui-Gon Jinn's Lightsaber",
  kind: 'upgrade',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  unique: true,
  cost: 2,
  token: false,
  modifiers: {
    power: 3,
    hp: 1,
  },
  attachTo: 'non-vehicle',
  attachFilter: {
    controller: 'friendly',
  },
  triggers: [
    {
      id: 'disarm',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'attached',
            filter: {
              name: 'Qui-Gon Jinn',
            },
          },
          effects: [
            {
              kind: 'select-units',
              filter: {},
              budget: {
                stat: 'cost',
                max: 6,
              },
              bind: 'affected',
              effects: [
                {
                  kind: 'exhaust-group',
                  group: 'affected',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
