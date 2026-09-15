import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-choices.json.
export const eliaKaneFalseConvert = {
  cardId: 'elia-kane--false-convert',
  name: 'Elia Kane, False Convert',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'New Republic'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 6,
  arena: 'ground',
  raid: 1,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-resources',
          chooser: 'self',
          player: 'enemy',
          exhausted: 'any',
          min: 3,
          max: 3,
          operation: 'inspect',
          group: 'resources',
          effects: [
            {
              kind: 'inspect-zone',
              onlyFromGroup: 'resources',
              zone: 'resources',
              player: 'enemy',
              chooser: 'self',
              filter: {},
              min: 0,
              max: 1,
              bind: 'resource',
              effects: [
                {
                  kind: 'defeat-resource',
                  target: 'resource',
                },
                {
                  kind: 'resource-top',
                  player: 'enemy',
                  optional: false,
                  ready: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
