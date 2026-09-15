import type { UpgradeDefinition } from '../definition.ts';

// SEC 069. Printed text is pinned in the meta token fixture.
export const nimbleProwess = {
  cardId: 'nimble-prowess',
  name: 'Nimble Prowess',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Innate'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'friendly-unit',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            sameArenaAs: 'attached',
          },
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
