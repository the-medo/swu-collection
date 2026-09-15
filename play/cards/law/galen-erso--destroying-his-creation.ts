import type { UnitDefinition } from '../definition.ts';

// LAW 233. Printed text is pinned in meta-continuous fixture.
export const galenErsoDestroyingHisCreation = {
  cardId: 'galen-erso--destroying-his-creation',
  name: 'Galen Erso, Destroying His Creation',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Imperial'],
  cost: 3,
  unique: true,
  power: 0,
  hp: 5,
  arena: 'ground',
  auras: [
    {
      id: 'enemy-training',
      filter: {
        controller: 'enemy',
      },
      abilities: {
        raid: 1,
        keywords: ['Saboteur'],
      },
    },
  ],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'give-control',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'take-control',
                    player: 'enemy',
                  },
                },
              ],
            },
            {
              id: 'keep-control',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
