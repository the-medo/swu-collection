import type { UpgradeDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-attachments fixture.
export const leiaSDisguise = {
  cardId: 'leia-s-disguise',
  name: "Leia's Disguise",
  kind: 'upgrade',
  token: false,
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Item', 'Armor'],
  cost: 2,
  unique: true,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  hostTraits: ['Underworld'],
  triggers: [
    {
      id: 'leia-shield',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'attached',
            filter: {
              name: 'Leia Organa',
            },
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              bind: 'chosen',
              optional: false,
              allowMissing: true,
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
} as const satisfies UpgradeDefinition;
