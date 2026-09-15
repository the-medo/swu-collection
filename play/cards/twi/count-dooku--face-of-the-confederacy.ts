import type { LeaderDefinition } from '../definition.ts';

// Official text and Dooku's phase-duration erratum are pinned in leader-exploit.json.
export const countDookuFaceOfTheConfederacy = {
  cardId: 'count-dooku--face-of-the-confederacy',
  name: 'Count Dooku, Face of the Confederacy',
  kind: 'leader',
  aspects: ['Villainy', 'Command'],
  traits: ['Force', 'Separatist', 'Sith'],
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
                trait: 'Separatist',
              },
              phaseAbilities: {
                exploit: 1,
              },
              optional: false,
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
      power: 5,
      hp: 9,
      arena: 'ground',
      keywords: ['Overwhelm'],
      triggers: [
        {
          id: 'separatist-exploit',
          timing: 'attack',
          effects: [
            {
              kind: 'next-play',
              filter: {
                trait: 'Separatist',
              },
              phaseAbilities: {
                exploit: 3,
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
