import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDevastatingGunship = {
  cardId: 'devastating-gunship',
  name: 'Devastating Gunship',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Transport'],
  cost: 5,
  power: 3,
  hp: 5,
  arena: 'space',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            remainingHpAtMost: 2,
          },
          optional: false,
          bind: 'chosen',
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
    },
  ],
} as const satisfies UnitDefinition;
