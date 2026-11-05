import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAsajjVentressCountDookuSAssassin = {
  cardId: 'asajj-ventress--count-dooku-s-assassin',
  name: "Asajj Ventress, Count Dooku's Assassin",
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Separatist', 'Sith'],
  cost: 4,
  unique: true,
  power: 2,
  hp: 4,
  arena: 'ground',
  exploit: 2,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-history-at-least',
            event: 'attacked',
            player: 'self',
            trait: 'Separatist',
            otherThan: 'source',
            amount: 1,
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'modify',
                power: 3,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
