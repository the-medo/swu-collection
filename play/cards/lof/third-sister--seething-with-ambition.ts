import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const thirdSisterSeethingWithAmbition = {
  cardId: 'third-sister--seething-with-ambition',
  name: 'Third Sister, Seething With Ambition',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Inquisitor'],
  unique: true,
  printedCost: 5,
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
              },
              optional: false,
              phaseAbilities: {
                keywords: ['Hidden'],
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
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 4,
      arena: 'ground',
      keywords: ['Hidden'],
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'next-play',
              filter: {
                kind: 'unit',
              },
              phaseAbilities: {
                keywords: ['Hidden'],
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
