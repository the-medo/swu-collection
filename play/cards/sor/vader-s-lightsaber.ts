import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVaderSLightsaber = {
  cardId: 'vader-s-lightsaber',
  name: "Vader's Lightsaber",
  kind: 'upgrade',
  aspects: ['Aggression', 'Villainy'],
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
              name: 'Darth Vader',
            },
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                arena: 'ground',
              },
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'damage-target',
                  target: 'chosen',
                  amount: 4,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
