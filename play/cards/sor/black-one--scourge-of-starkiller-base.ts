import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBlackOneScourgeOfStarkillerBase = {
  cardId: 'black-one--scourge-of-starkiller-base',
  name: 'Black One, Scourge of Starkiller Base',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Fighter'],
  cost: 6,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'resolve',
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'hand',
                  player: 'self',
                  chooser: 'owner',
                  filter: {},
                  min: {
                    kind: 'zone-size',
                    zone: 'hand',
                    player: 'self',
                  },
                  max: {
                    kind: 'zone-size',
                    zone: 'hand',
                    player: 'self',
                  },
                  bind: 'card',
                  effects: [
                    {
                      kind: 'move-cards',
                      group: 'hand',
                      from: 'hand',
                      to: 'discard',
                      discardBy: 'owner',
                    },
                  ],
                  group: 'hand',
                },
                {
                  kind: 'draw-cards',
                  amount: 3,
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'resolve',
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'hand',
                  player: 'self',
                  chooser: 'owner',
                  filter: {},
                  min: {
                    kind: 'zone-size',
                    zone: 'hand',
                    player: 'self',
                  },
                  max: {
                    kind: 'zone-size',
                    zone: 'hand',
                    player: 'self',
                  },
                  bind: 'card',
                  effects: [
                    {
                      kind: 'move-cards',
                      group: 'hand',
                      from: 'hand',
                      to: 'discard',
                      discardBy: 'owner',
                    },
                  ],
                  group: 'hand',
                },
                {
                  kind: 'draw-cards',
                  amount: 3,
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
