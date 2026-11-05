import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAdmiralTrenchHoldingTheLine = {
  cardId: 'admiral-trench--holding-the-line',
  name: 'Admiral Trench, Holding the Line',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Separatist', 'Official'],
  cost: 7,
  unique: true,
  power: 5,
  hp: 5,
  arena: 'ground',
  exploit: 1,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'self',
          filter: {
            kind: 'unit',
            defeatedThisPhase: true,
          },
          min: 0,
          max: 3,
          bind: 'card',
          effects: [
            {
              kind: 'move-cards',
              group: 'returned',
              from: 'discard',
              to: 'hand',
            },
          ],
          group: 'returned',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
