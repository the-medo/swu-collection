import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSalaciousCrumbObnoxiousPet = {
  cardId: 'salacious-crumb--obnoxious-pet',
  name: 'Salacious Crumb, Obnoxious Pet',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld', 'Creature'],
  cost: 1,
  unique: true,
  power: 1,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'heal-own-base',
          amount: 1,
        },
      ],
    },
  ],
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'exhaust-self',
        },
        {
          kind: 'return-friendly-unit',
          filter: {
            sameAs: 'source',
          },
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
