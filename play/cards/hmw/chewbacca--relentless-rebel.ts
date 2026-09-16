import { hmwLeader } from './define.ts';

export const hmwChewbaccaRelentlessRebel = hmwLeader('chewbacca--relentless-rebel', {
  leader: {
    actions: [
      {
        id: 'attack',
        costs: [
          {
            kind: 'resources',
            amount: 2,
          },
          {
            kind: 'exhaust-self',
          },
        ],
        limit: null,
        effects: [
          {
            kind: 'select-unit',
            filter: {},
            forAttack: {
              unitsOnly: true,
              evenIfExhausted: true,
            },
            bind: 'attacker',
            optional: false,
            effects: [
              {
                kind: 'attack-bound',
                target: 'attacker',
                optional: false,
                unitsOnly: true,
                evenIfExhausted: true,
              },
            ],
          },
        ],
      },
    ],
  },
  unit: {
    actions: [
      {
        id: 'attack',
        costs: [],
        limit: 'once-per-round',
        effects: [
          {
            kind: 'select-unit',
            filter: {},
            forAttack: {
              unitsOnly: true,
              evenIfExhausted: true,
            },
            bind: 'attacker',
            optional: false,
            effects: [
              {
                kind: 'attack-bound',
                target: 'attacker',
                optional: false,
                unitsOnly: true,
                evenIfExhausted: true,
              },
            ],
          },
        ],
      },
    ],
  },
});
