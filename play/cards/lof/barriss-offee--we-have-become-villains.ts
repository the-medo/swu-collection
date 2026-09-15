import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const barrissOffeeWeHaveBecomeVillains = {
  cardId: 'barriss-offee--we-have-become-villains',
  name: 'Barriss Offee, We Have Become Villains',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'force',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'event',
              },
              optional: false,
              discount: 1,
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
      power: 4,
      hp: 7,
      arena: 'ground',
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'force',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'event',
              },
              optional: false,
              discount: 1,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
