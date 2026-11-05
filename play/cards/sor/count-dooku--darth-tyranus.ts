import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCountDookuDarthTyranus = {
  cardId: 'count-dooku--darth-tyranus',
  name: 'Count Dooku, Darth Tyranus',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Sith', 'Separatist'],
  cost: 7,
  unique: true,
  power: 5,
  hp: 4,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            remainingHpAtMost: 4,
          },
          optional: true,
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
