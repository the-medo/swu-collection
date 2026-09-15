import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 ability costs fixture.
export const jabbaTheHuttCrimeBoss = {
  cardId: 'jabba-the-hutt--crime-boss',
  name: 'Jabba the Hutt, Crime Boss',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Hutt'],
  unique: true,
  printedCost: 6,
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
                amount: 6,
              },
            },
          ],
        },
        {
          id: 'collect-debt',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'return-friendly-unit',
              filter: {
                controller: 'friendly',
                trait: 'Underworld',
              },
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'create-credits',
              amount: 1,
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 9,
      arena: 'ground',
      actions: [
        {
          id: 'underworld-ambush',
          costs: [],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              requirePlay: true,
              from: 'hand',
              filter: {
                kind: 'unit',
                trait: 'Underworld',
              },
              optional: false,
              phaseAbilitiesWithCredit: {
                keywords: ['Ambush'],
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
