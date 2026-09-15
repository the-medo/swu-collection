import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attachment fixture.
export const pongKrellItSTreasonThen = {
  cardId: 'pong-krell--it-s-treason--then',
  name: "Pong Krell, It's Treason, Then",
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 7,
  power: 2,
  hp: 9,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'defeat-weaker',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            remainingHpLessThanPower: 'source',
          },
          optional: true,
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {},
      },
    },
  ],
} as const satisfies UnitDefinition;
