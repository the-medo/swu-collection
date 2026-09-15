import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const anakinSkywalkerTemptedByTheDarkSide = {
  cardId: 'anakin-skywalker--tempted-by-the-dark-side',
  name: 'Anakin Skywalker, Tempted by the Dark Side',
  kind: 'leader',
  aspects: ['Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
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
                playAs: 'non-unit',
                aspect: 'Villainy',
              },
              optional: false,
              ignoreAspectPenalties: true,
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
      power: 4,
      hp: 6,
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
                playAs: 'non-unit',
                aspect: 'Villainy',
              },
              optional: false,
              ignoreAspectPenalties: true,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
