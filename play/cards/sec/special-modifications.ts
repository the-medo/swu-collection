import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const specialModifications = {
  cardId: 'special-modifications',
  name: 'Special Modifications',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Modification'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 3,
  },
  attachTo: 'unit',
  attachFilter: {
    trait: 'Vehicle',
  },
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'create-spy',
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'spy',
                  count: 1,
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'attached',
        filter: {
          trait: 'Transport',
        },
      },
    },
  ],
} as const satisfies UpgradeDefinition;
