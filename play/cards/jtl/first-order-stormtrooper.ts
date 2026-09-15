import type { UnitDefinition } from '../definition.ts';

// JTL 132. Printed text is pinned in meta-force-indirect fixture.
export const firstOrderStormtrooper = {
  cardId: 'first-order-stormtrooper',
  name: 'First Order Stormtrooper',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['First Order', 'Trooper'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'indirect-damage',
          amount: 1,
          recipient: 'chosen',
        },
      ],
    },
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'indirect-damage',
          amount: 1,
          recipient: 'chosen',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
