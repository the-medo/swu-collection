import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const bansheeCripplingCommand = {
  cardId: 'banshee--crippling-command',
  name: 'Banshee, Crippling Command',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Separatist', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'wounded-command',
      timing: 'attack',
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
                kind: 'damage',
                amount: {
                  kind: 'unit-stat',
                  target: 'source',
                  stat: 'damage',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
