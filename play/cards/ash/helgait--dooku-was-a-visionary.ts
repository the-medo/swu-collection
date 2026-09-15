import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const helgaitDookuWasAVisionary = {
  cardId: 'helgait--dooku-was-a-visionary',
  name: 'Helgait, Dooku Was a Visionary',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist'],
  unique: true,
  cost: 5,
  power: 6,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'distribute-advantage',
      timing: 'defeated',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'distribute',
              effects: [
                {
                  kind: 'distribute',
                  benefit: 'advantage',
                  amount: {
                    kind: 'unit-stat',
                    target: 'source',
                    stat: 'power',
                  },
                  filter: {
                    controller: 'friendly',
                  },
                  bind: 'granted',
                  effects: [],
                  exact: true,
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
    },
  ],
} as const satisfies UnitDefinition;
