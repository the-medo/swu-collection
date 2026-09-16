import { hmwLeader } from './define.ts';

const attack = {
  kind: 'select-unit' as const,
  filter: {},
  forAttack: {},
  bind: 'attacker',
  optional: false,
  effects: [
    {
      kind: 'attack-bound' as const,
      target: 'attacker',
      optional: false,
      swapRaidRestore: true,
    },
  ],
};

export const hmwAsajjVentressNoTimeForRegret = hmwLeader('asajj-ventress--no-time-for-regret', {
  leader: {
    actions: [
      {
        id: 'attack',
        costs: [{ kind: 'exhaust-self' }],
        limit: null,
        effects: [attack],
      },
    ],
  },
  unit: {
    restore: 2,
    actions: [{ id: 'attack', costs: [], limit: null, effects: [attack] }],
  },
});
