import type { UnitDefinition } from '../definition.ts';

// LAW . Printed text is pinned in the meta effects fixture.
export const jynErsoTakeTheNextChance = {
  cardId: 'jyn-erso--take-the-next-chance',
  name: 'Jyn Erso, Take the Next Chance',
  kind: 'unit',
  aspects: ['Command', 'Cunning', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'give-experience',
              effects: [
                {
                  kind: 'select-unit',
                  bind: 'chosen',
                  filter: {},
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 1,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'exhaust-unit',
              effects: [
                {
                  kind: 'select-unit',
                  bind: 'chosen',
                  filter: {},
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'exhaust',
                      },
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
