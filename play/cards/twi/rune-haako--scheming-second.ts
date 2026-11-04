import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 016; identity and text follow the official catalog.
export const ic27ReprintRuneHaakoSchemingSecond = {
  cardId: 'rune-haako--scheming-second',
  name: 'Rune Haako, Scheming Second',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Separatist', 'Official'],
  cost: 2,
  unique: true,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'friendly-unit-defeated',
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -1,
                    hp: -1,
                    duration: 'phase',
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
