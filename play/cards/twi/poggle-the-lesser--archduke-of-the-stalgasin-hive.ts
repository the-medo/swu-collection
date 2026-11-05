import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePoggleTheLesserArchdukeOfTheStalgasinHive = {
  cardId: 'poggle-the-lesser--archduke-of-the-stalgasin-hive',
  name: 'Poggle the Lesser, Archduke of the Stalgasin Hive',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Separatist', 'Official'],
  cost: 2,
  unique: true,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'friendly-played',
      timing: 'friendly-played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'resolve',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'exhaust',
                  },
                  ifYouDo: [
                    {
                      kind: 'create-unit',
                      cardId: 'battle-droid',
                      count: 1,
                    },
                  ],
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
      excludeSelf: true,
    },
  ],
} as const satisfies UnitDefinition;
