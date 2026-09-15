import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const houndSToothHuntersApproach = {
  cardId: 'hound-s-tooth--hunters--approach',
  name: "Hound's Tooth, Hunters' Approach",
  kind: 'unit',
  aspects: ['Vigilance', 'Command', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 7,
  power: 4,
  hp: 8,
  arena: 'space',
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            powerLessThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
            },
          ],
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {},
      },
    },
  ],
} as const satisfies UnitDefinition;
