import type { LeaderDefinition } from '../definition.ts';

// ASH . Printed text is pinned in the meta effects fixture.
export const ahsokaTanoTrustInTheForce = {
  cardId: 'ahsoka-tano--trust-in-the-force',
  name: 'Ahsoka Tano, Trust in the Force',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi'],
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'boost-unit',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                powerLessThan: 'any-friendly',
              },
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 2,
                    hp: 0,
                    duration: 'phase',
                  },
                },
              ],
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
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 6,
      arena: 'ground',
      keywords: ['Support'],
      triggers: [
        {
          id: 'on-attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                powerLessThan: 'source',
              },
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 2,
                    hp: 0,
                    duration: 'phase',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
