import { ic27Event } from './define.ts';

export const ic27CunningPloy = ic27Event('cunning-ploy', [
  {
    kind: 'inspect-zone',
    zone: 'hand',
    player: 'enemy',
    chooser: 'self',
    filter: {},
    min: 0,
    max: 1,
    bind: 'chosen',
    effects: [
      {
        kind: 'move-card',
        target: 'chosen',
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
  {
    kind: 'select-unit',
    filter: {
      controller: 'enemy',
    },
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'on-unit',
        target: 'chosen',
        operation: {
          kind: 'exhaust',
        },
      },
    ],
  },
  {
    kind: 'select-unit',
    filter: {
      controller: 'friendly',
    },
    bind: 'chosen',
    optional: true,
    effects: [
      {
        kind: 'attack-bound',
        target: 'chosen',
        optional: false,
        powerBonus: 3,
      },
    ],
    forAttack: {},
  },
]);
