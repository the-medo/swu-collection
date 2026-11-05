import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMandalorianArmor = {
  cardId: 'mandalorian-armor',
  name: 'Mandalorian Armor',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Item', 'Armor'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 3,
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
              trait: 'Mandalorian',
            },
          },
          effects: [
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
