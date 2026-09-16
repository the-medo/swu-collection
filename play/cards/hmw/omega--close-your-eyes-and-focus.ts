import { hmwLeader } from './define.ts';

export const hmwOmegaCloseYourEyesAndFocus = hmwLeader('omega--close-your-eyes-and-focus', {
  leader: {
    actions: [
      {
        id: 'attack',
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
            kind: 'select-unit',
            filter: {
              anyAspect: ['Heroism'],
            },
            forAttack: {},
            bind: 'attacker',
            optional: false,
            effects: [
              {
                kind: 'attack-bound',
                target: 'attacker',
                optional: false,
                abilities: {
                  keywords: ['Grit'],
                },
              },
            ],
          },
        ],
      },
    ],
  },
  unit: {
    auras: [
      {
        id: 'grit',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          anyAspect: ['Heroism'],
        },
        abilities: {
          keywords: ['Grit'],
        },
      },
    ],
  },
});
