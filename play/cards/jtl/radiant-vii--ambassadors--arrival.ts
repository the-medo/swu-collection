import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const radiantViiAmbassadorsArrival = {
  cardId: 'radiant-vii--ambassadors--arrival',
  name: "Radiant VII, Ambassadors' Arrival",
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Republic', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 7,
  power: 5,
  hp: 6,
  arena: 'space',
  auras: [
    {
      id: 'wounded-enemies',
      filter: {
        controller: 'enemy',
        nonLeader: true,
      },
      power: {
        kind: 'difference',
        left: 0,
        right: {
          kind: 'unit-stat',
          target: 'recipient',
          stat: 'damage',
        },
      },
    },
  ],
  triggers: [
    {
      id: 'arrival-damage',
      timing: 'played',
      effects: [
        {
          kind: 'indirect-damage',
          amount: 5,
          recipient: 'chosen',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
