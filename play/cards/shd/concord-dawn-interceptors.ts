import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 036; identity and text follow the official catalog.
export const ic27ReprintConcordDawnInterceptors = {
  cardId: 'concord-dawn-interceptors',
  name: 'Concord Dawn Interceptors',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Mandalorian', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 1,
  hp: 4,
  arena: 'space',
  keywords: ['Sentinel'],
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          defending: true,
        },
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
