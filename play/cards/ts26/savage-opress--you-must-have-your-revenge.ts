import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const savageOpressYouMustHaveYourRevenge = {
  cardId: 'savage-opress--you-must-have-your-revenge',
  name: 'Savage Opress, You Must Have Your Revenge',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Underworld'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      auras: [
        {
          id: 'strongest',
          filter: {
            controller: 'friendly',
            mostPowerAmong: {
              controller: 'friendly',
            },
          },
          abilities: {
            keywords: ['Overwhelm'],
          },
        },
      ],
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 7,
      arena: 'ground',
      raid: 3,
      keywords: ['Overwhelm'],
      auras: [
        {
          id: 'others',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          abilities: {
            keywords: ['Overwhelm'],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
