import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const crixMadineStrikeTeamStrategist = {
  cardId: 'crix-madine--strike-team-strategist',
  name: 'Crix Madine, Strike Team Strategist',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Official'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'hero-play',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'more-units-than-opponent',
            arena: 'ground',
          },
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'more-units-than-opponent',
                arena: 'space',
              },
              effects: [
                {
                  kind: 'play-card',
                  from: 'hand',
                  filter: {
                    kind: 'unit',
                    aspect: 'Heroism',
                  },
                  discount: 4,
                  optional: true,
                },
              ],
              otherwise: [
                {
                  kind: 'play-card',
                  from: 'hand',
                  filter: {
                    kind: 'unit',
                    aspect: 'Heroism',
                  },
                  discount: 2,
                  optional: true,
                },
              ],
            },
          ],
          otherwise: [
            {
              kind: 'if',
              condition: {
                kind: 'more-units-than-opponent',
                arena: 'space',
              },
              effects: [
                {
                  kind: 'play-card',
                  from: 'hand',
                  filter: {
                    kind: 'unit',
                    aspect: 'Heroism',
                  },
                  discount: 2,
                  optional: true,
                },
              ],
              otherwise: [
                {
                  kind: 'play-card',
                  from: 'hand',
                  filter: {
                    kind: 'unit',
                    aspect: 'Heroism',
                  },
                  discount: 0,
                  optional: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
