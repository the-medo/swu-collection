import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const shieldDriveOutfitter = {
  cardId: 'shield-drive-outfitter',
  name: 'Shield Drive Outfitter',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Underworld'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'paid-shield',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
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
    },
  ],
} as const satisfies UnitDefinition;
