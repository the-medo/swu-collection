import type { UnitDefinition } from '../definition.ts';

// ASH 053. Printed text is pinned in the meta token fixture.
export const preVizslaStrongWilledRuler = {
  cardId: 'pre-vizsla--strong-willed-ruler',
  name: 'Pre Vizsla, Strong-Willed Ruler',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Mandalorian', 'Official'],
  unique: true,
  cost: 8,
  power: 6,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-units',
          filter: {
            nonLeader: true,
          },
          bind: 'victims',
          remainingHpBudget: 6,
          effects: [
            {
              kind: 'defeat-group',
              group: 'victims',
              countAs: 'defeated',
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'mandalorian',
                  count: {
                    kind: 'value',
                    name: 'defeated',
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
