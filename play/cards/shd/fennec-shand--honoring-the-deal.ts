import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const fennecShandHonoringTheDeal = {
  cardId: 'fennec-shand--honoring-the-deal',
  name: 'Fennec Shand, Honoring the Deal',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
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
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
                maxCost: 4,
              },
              optional: false,
              phaseAbilities: {
                keywords: ['Ambush'],
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
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 4,
      arena: 'ground',
      keywords: ['Saboteur'],
      actions: [
        {
          id: 'leader-action',
          costs: [],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
                maxCost: 4,
              },
              optional: false,
              phaseAbilities: {
                keywords: ['Ambush'],
              },
              requirePlay: true,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
