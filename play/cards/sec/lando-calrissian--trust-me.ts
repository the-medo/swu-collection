import type { UnitDefinition } from '../definition.ts';
export const landoCalrissianTrustMe = {
  cardId: 'lando-calrissian--trust-me',
  name: 'Lando Calrissian, Trust Me',
  kind: 'unit',
  unique: true,
  cost: 7,
  power: 6,
  hp: 8,
  arena: 'ground',
  aspects: ['Vigilance'],
  traits: ['Fringe', 'Official'],
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played-hostage',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: { controller: 'enemy' },
          optional: true,
          bind: 'guard',
          effects: [
            {
              kind: 'select-unit',
              filter: { controller: 'friendly', nonLeader: true, otherThan: 'source' },
              optional: true,
              bind: 'prisoner',
              effects: [
                { kind: 'heal-own-base', amount: 6 },
                { kind: 'capture-unit', guard: 'guard', target: 'prisoner' },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
