import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-keywords.json.
export const admiralYularenFleetCoordinator = {
  cardId: 'admiral-yularen--fleet-coordinator',
  name: 'Admiral Yularen, Fleet Coordinator',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Republic', 'Official'],
  unique: true,
  cost: 3,
  power: 1,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'fleet-keyword',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'grit',
              effects: [
                {
                  kind: 'grant-keyword-until-source-leaves',
                  trait: 'Vehicle',
                  abilities: {
                    keywords: ['Grit'],
                  },
                },
              ],
            },
            {
              id: 'restore',
              effects: [
                {
                  kind: 'grant-keyword-until-source-leaves',
                  trait: 'Vehicle',
                  abilities: {
                    restore: 1,
                  },
                },
              ],
            },
            {
              id: 'sentinel',
              effects: [
                {
                  kind: 'grant-keyword-until-source-leaves',
                  trait: 'Vehicle',
                  abilities: {
                    keywords: ['Sentinel'],
                  },
                },
              ],
            },
            {
              id: 'shielded',
              effects: [
                {
                  kind: 'grant-keyword-until-source-leaves',
                  trait: 'Vehicle',
                  abilities: {
                    keywords: ['Shielded'],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
