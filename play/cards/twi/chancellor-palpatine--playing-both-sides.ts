import type { LeaderDefinition } from '../definition.ts';

// TWI 017 has two Leader faces and never deploys. Catalog aspects describe both sides;
// only the face in play supplies aspects, traits and abilities (v8 section 3.4).
export const chancellorPalpatinePlayingBothSides = {
  cardId: 'chancellor-palpatine--playing-both-sides',
  name: 'Chancellor Palpatine, Playing Both Sides',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy', 'Heroism'],
  traits: ['Republic', 'Official'],
  unique: true,
  printedCost: null,
  faces: {
    leader: {
      title: 'Chancellor Palpatine',
      name: 'Chancellor Palpatine, Playing Both Sides',
      aspects: ['Cunning', 'Heroism'],
      traits: ['Republic', 'Official'],
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
              kind: 'if',
              condition: {
                kind: 'unit-history-at-least',
                event: 'defeated',
                player: 'self',
                amount: 1,
                aspect: 'Heroism',
              },
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                  player: 'self',
                },
                {
                  kind: 'heal-own-base',
                  amount: 2,
                },
                {
                  kind: 'flip-leader',
                },
              ],
            },
          ],
        },
      ],
    },
    alternate: {
      title: 'Darth Sidious',
      name: 'Darth Sidious, Playing Both Sides',
      aspects: ['Cunning', 'Villainy'],
      traits: ['Force', 'Separatist', 'Sith'],
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
              kind: 'if',
              condition: {
                kind: 'played-card-this-phase',
                filter: {
                  aspect: 'Villainy',
                },
              },
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'clone-trooper',
                  count: 1,
                },
                {
                  kind: 'damage-bases',
                  targets: 'enemy',
                  amount: 2,
                },
                {
                  kind: 'flip-leader',
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
