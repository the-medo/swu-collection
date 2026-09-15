import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 leader choices fixture.
export const sabQueenSShadow = {
  cardId: 'sab---queen-s-shadow',
  name: "Sabé, Queen's Shadow",
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Naboo'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
            },
          ],
        },
      ],
      triggers: [
        {
          id: 'defender-deck',
          timing: 'friendly-attack-ended',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'exhaust-self',
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'look-deck',
                  player: 'enemy',
                  count: 2,
                  mode: 'discard-one',
                  minDiscard: 1,
                },
              ],
            },
          ],
          condition: {
            kind: 'value-at-least',
            name: 'combat-base-damage',
            amount: 1,
          },
        },
      ],
    },
    unit: {
      power: 3,
      hp: 6,
      arena: 'ground',
      raid: 1,
      triggers: [
        {
          id: 'defender-hand',
          timing: 'attack-ended',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'enemy',
              chooser: 'self',
              filter: {},
              min: 0,
              max: 1,
              bind: 'discard',
              effects: [
                {
                  kind: 'move-card',
                  target: 'discard',
                  from: 'hand',
                  to: 'discard',
                  effects: [
                    {
                      kind: 'draw-cards',
                      amount: 1,
                      player: 'enemy',
                    },
                  ],
                },
              ],
            },
          ],
          condition: {
            kind: 'value-at-least',
            name: 'combat-base-damage',
            amount: 1,
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
