import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-phase.json.
export const greefKargaIntroductionsAreInOrder = {
  cardId: 'greef-karga--introductions-are-in-order',
  name: 'Greef Karga, Introductions are in Order',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Official'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  actions: [
    {
      id: 'introductions',
      costs: [
        {
          kind: 'resources',
          amount: 1,
        },
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'phase-event',
            event: 'own-base-attacked',
          },
          effects: [
            {
              kind: 'create-unit',
              cardId: 'mandalorian',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
