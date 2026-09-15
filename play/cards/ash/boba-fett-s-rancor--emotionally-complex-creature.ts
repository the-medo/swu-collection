import type { UnitDefinition } from '../definition.ts';

// ASH 179. Printed text is pinned in meta-board fixture.
export const bobaFettSRancorEmotionallyComplexCreature = {
  cardId: 'boba-fett-s-rancor--emotionally-complex-creature',
  name: "Boba Fett's Rancor, Emotionally Complex Creature",
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Creature'],
  unique: true,
  cost: 8,
  power: 8,
  hp: 9,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-own-base',
          amount: 5,
        },
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 5,
              },
            },
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-target',
          bases: 'any',
          bind: 'damage-target',
          optional: true,
          effects: [
            {
              kind: 'damage-target',
              target: 'damage-target',
              amount: {
                kind: 'own-base-damage',
                divisor: 5,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
