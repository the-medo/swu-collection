import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCountDookuFallenJedi = {
  cardId: 'count-dooku--fallen-jedi',
  name: 'Count Dooku, Fallen Jedi',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Separatist', 'Sith'],
  cost: 8,
  unique: true,
  power: 6,
  hp: 6,
  arena: 'ground',
  exploit: 2,
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-group-damage',
          group: 'exploited-units',
          filter: {
            controller: 'enemy',
          },
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
