import type { LeaderDefinition } from '../definition.ts';

// Exhausting a unit is a chosen cost, separate from resource payment and play.
export const fennecShandReadyForWar = {
  cardId: 'fennec-shand--ready-for-war',
  name: 'Fennec Shand, Ready for War',
  kind: 'leader',
  aspects: ['Aggression', 'Cunning'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 4,
  faces: {
    leader: {
      actions: [
        {
          id: 'ready-unit',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'exhaust-friendly-unit',
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
              ready: true,
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
                amount: 4,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 4,
      arena: 'ground',
      keywords: ['Saboteur'],
      actions: [
        {
          id: 'ready-unit',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-friendly-unit',
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
              ready: true,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
