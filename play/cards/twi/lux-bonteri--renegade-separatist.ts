import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLuxBonteriRenegadeSeparatist = {
  cardId: 'lux-bonteri--renegade-separatist',
  name: 'Lux Bonteri, Renegade Separatist',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Separatist'],
  cost: 2,
  unique: true,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'enemy-card-played',
      timing: 'enemy-card-played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'numeric-greater',
            left: {
              kind: 'card-cost',
              target: 'subject',
            },
            right: {
              kind: 'resources-paid',
              target: 'subject',
            },
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'ready',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'ready',
                          },
                        },
                      ],
                    },
                    {
                      id: 'exhaust',
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
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
