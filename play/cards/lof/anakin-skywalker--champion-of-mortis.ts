import type { UnitDefinition } from '../definition.ts';

// LOF . Printed text is pinned in the meta effects fixture.
export const anakinSkywalkerChampionOfMortis = {
  cardId: 'anakin-skywalker--champion-of-mortis',
  name: 'Anakin Skywalker, Champion of Mortis',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'discard-heroism',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'discard-aspect',
            aspect: 'Heroism',
          },
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {},
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -3,
                    hp: -3,
                    duration: 'phase',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'discard-villainy',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'discard-aspect',
            aspect: 'Villainy',
          },
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {},
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -3,
                    hp: -3,
                    duration: 'phase',
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
