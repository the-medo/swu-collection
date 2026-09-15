import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const chewbaccaWalkingCarpet = {
  cardId: 'chewbacca--walking-carpet',
  name: 'Chewbacca, Walking Carpet',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Underworld', 'Wookiee'],
  unique: true,
  printedCost: 7,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
                maxCost: 3,
              },
              optional: false,
              phaseAbilities: {
                keywords: ['Sentinel'],
              },
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
      power: 2,
      hp: 9,
      arena: 'ground',
      keywords: ['Sentinel', 'Grit'],
    },
  },
} as const satisfies LeaderDefinition;
