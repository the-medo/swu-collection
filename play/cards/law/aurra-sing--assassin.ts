import type { LeaderDefinition } from '../definition.ts';

// LAW . V8 rules; printed text pinned in meta combat fixture.
export const aurraSingAssassin = {
  cardId: 'aurra-sing--assassin',
  name: 'Aurra Sing, Assassin',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  printedCost: 7,
  faces: {
    leader: {
      actions: [
        {
          id: 'defeat-unit',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'defeat-unit',
              filter: {
                nonLeader: true,
                remainingHpAtMost: 1,
              },
              optional: false,
            },
          ],
        },
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
                amount: 7,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'on-deployed',
          timing: 'deployed',
          effects: [
            {
              kind: 'defeat-unit',
              filter: {
                nonLeader: true,
                remainingHpAtMost: 5,
              },
              optional: true,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
