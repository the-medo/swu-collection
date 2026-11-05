import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGideonSLightCruiserDarkTroopersStation = {
  cardId: 'gideon-s-light-cruiser--dark-troopers--station',
  name: "Gideon's Light Cruiser, Dark Troopers' Station",
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 8,
  unique: true,
  power: 7,
  hp: 8,
  arena: 'space',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'controls-name',
            name: 'Moff Gideon',
          },
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'hand',
                  effects: [
                    {
                      kind: 'play-card',
                      from: 'hand',
                      filter: {
                        kind: 'unit',
                        aspect: 'Villainy',
                        maxCost: 3,
                      },
                      optional: false,
                      free: true,
                    },
                  ],
                },
                {
                  id: 'discard',
                  effects: [
                    {
                      kind: 'play-card',
                      from: 'discard',
                      filter: {
                        kind: 'unit',
                        aspect: 'Villainy',
                        maxCost: 3,
                      },
                      optional: false,
                      free: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
