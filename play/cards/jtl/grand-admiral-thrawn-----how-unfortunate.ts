import type { LeaderDefinition } from '../definition.ts';

// JTL 002: leader exhaustion and the unit's round limit belong to separate faces.
export const grandAdmiralThrawnHowUnfortunate = {
  cardId: 'grand-admiral-thrawn-----how-unfortunate',
  name: 'Grand Admiral Thrawn, ...How Unfortunate',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Official'],
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
              condition: { kind: 'resources-at-least', amount: 6 },
            },
          ],
        },
      ],
      triggers: [
        {
          id: 'repeat-defeated',
          timing: 'defeated-ability-used',
          effects: [
            {
              kind: 'pay',
              costs: [{ kind: 'exhaust-self' }],
              optional: true,
              effects: [{ kind: 'repeat-defeated-ability', index: 'used-defeated' }],
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'repeat-defeated',
          timing: 'defeated-ability-used',
          optional: true,
          limit: 'once-per-round',
          effects: [{ kind: 'repeat-defeated-ability', index: 'used-defeated' }],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
