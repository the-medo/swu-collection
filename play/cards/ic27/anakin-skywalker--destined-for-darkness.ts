import { ic27Unit } from './define.ts';

export const ic27AnakinSkywalkerDestinedForDarkness = ic27Unit(
  'anakin-skywalker--destined-for-darkness',
  {
    discardAbilities: {
      ignoreAspectPenalties: [
        {
          filter: {
            name: 'Darth Vader',
          },
        },
      ],
    },
    triggers: [
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'search-deck',
            count: {
              kind: 'zone-size',
              zone: 'deck',
              player: 'self',
            },
            filter: 'any',
            name: 'Darth Vader',
            max: 1,
          },
        ],
      },
    ],
  },
);
