import { hmwLeader } from './define.ts';

export const hmwWicketFewGreaterBattlesToFight = hmwLeader('wicket--few-greater-battles-to-fight', {
  leader: {
    triggers: [
      {
        id: 'bigger-target',
        timing: 'friendly-attack',
        condition: {
          kind: 'numeric-greater',
          left: {
            kind: 'card-cost',
            target: 'defender',
          },
          right: {
            kind: 'card-cost',
            target: 'attacker',
          },
        },
        optional: true,
        effects: [
          {
            kind: 'exhaust-leader',
            effects: [
              {
                kind: 'draw-cards',
                amount: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  unit: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        condition: {
          kind: 'units-at-least',
          filter: {
            controller: 'friendly',
            maxCost: 3,
          },
          amount: 1,
        },
        effects: [
          {
            kind: 'draw-cards',
            amount: 1,
          },
        ],
      },
    ],
  },
});
