import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const countDookuOfferingAid = {
  cardId: 'count-dooku--offering-aid',
  name: 'Count Dooku, Offering Aid',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Separatist', 'Sith', 'Official'],
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
              kind: 'heal-own-base',
              amount: 1,
              player: 'self',
            },
            {
              kind: 'heal-own-base',
              amount: 1,
              player: 'enemy',
            },
            {
              kind: 'create-unit',
              cardId: 'battle-droid',
              count: 1,
              player: 'self',
            },
            {
              kind: 'create-unit',
              cardId: 'battle-droid',
              count: 1,
              player: 'enemy',
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
              condition: {
                kind: 'resources-at-least',
                amount: 7,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 6,
      hp: 7,
      arena: 'ground',
      restore: 2,
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'create-unit',
              cardId: 'battle-droid',
              count: 2,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
