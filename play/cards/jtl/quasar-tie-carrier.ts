import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const quasarTieCarrier = {
  cardId: 'quasar-tie-carrier',
  name: 'Quasar TIE Carrier',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 5,
  hp: 7,
  arena: 'space',
  triggers: [
    {
      id: 'launch',
      timing: 'attack',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'tie-fighter',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
