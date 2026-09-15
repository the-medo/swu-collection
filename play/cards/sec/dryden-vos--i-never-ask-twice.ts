import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 ability costs fixture.
export const drydenVosINeverAskTwice = {
  cardId: 'dryden-vos--i-never-ask-twice',
  name: 'Dryden Vos, I Never Ask Twice',
  kind: 'leader',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 7,
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
                amount: 7,
              },
            },
          ],
        },
        {
          id: 'command-ambush',
          costs: [
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'discard-hand',
              count: 1,
              filter: {
                minCost: 6,
              },
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
                maxCost: 5,
              },
              optional: false,
              phaseAbilities: {
                keywords: ['Ambush'],
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 7,
      arena: 'ground',
      keywords: ['Overwhelm'],
      actions: [
        {
          id: 'unit-ambush',
          costs: [
            {
              kind: 'discard-hand',
              count: 1,
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
              },
              optional: false,
              phaseAbilities: {
                keywords: ['Ambush'],
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
