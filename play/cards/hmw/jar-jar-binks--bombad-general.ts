import { hmwLeader } from './define.ts';

export const hmwJarJarBinksBombadGeneral = hmwLeader('jar-jar-binks--bombad-general', {
  leader: {
    actions: [
      {
        id: 'bombad',
        condition: {
          kind: 'phase-event',
          event: 'token-upgrade-given',
        },
        costs: [
          {
            kind: 'resources',
            amount: 1,
          },
          {
            kind: 'exhaust-self',
          },
        ],
        limit: null,
        effects: [
          {
            kind: 'damage-unit',
            amount: 1,
            arena: 'any',
            optional: false,
          },
          {
            kind: 'select-target',
            bases: 'any',
            bind: 'base',
            optional: false,
            effects: [
              {
                kind: 'heal-target',
                target: 'base',
                amount: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  unit: {
    keywords: ['Shielded'],
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        condition: {
          kind: 'phase-event',
          event: 'token-upgrade-given',
        },
        optional: true,
        effects: [
          {
            kind: 'damage-unit',
            amount: 1,
            arena: 'any',
            optional: false,
          },
          {
            kind: 'select-target',
            bases: 'any',
            bind: 'base',
            optional: false,
            effects: [
              {
                kind: 'heal-target',
                target: 'base',
                amount: 1,
              },
            ],
          },
        ],
      },
    ],
  },
});
