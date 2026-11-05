import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMillenniumFalconPieceOfJunk = {
  cardId: 'millennium-falcon--piece-of-junk',
  name: 'Millennium Falcon, Piece of Junk',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'space',
  entersReady: {
    kind: 'always',
  },
  triggers: [
    {
      id: 'regroup-ready',
      timing: 'regroup-ready',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          optional: true,
          effects: [],
          otherwise: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
