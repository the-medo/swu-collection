import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheZilloBeastAwokenFromTheDepths = {
  cardId: 'the-zillo-beast--awoken-from-the-depths',
  name: 'The Zillo Beast, Awoken From The Depths',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Creature'],
  cost: 9,
  unique: true,
  power: 10,
  hp: 10,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'modify-units',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          operation: {
            kind: 'modify',
            power: -5,
            hp: 0,
            duration: 'phase',
          },
        },
      ],
    },
    {
      id: 'regroup-start',
      timing: 'regroup-start',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'heal',
            amount: 5,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
