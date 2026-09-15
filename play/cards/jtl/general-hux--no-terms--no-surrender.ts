import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const generalHuxNoTermsNoSurrender = {
  cardId: 'general-hux--no-terms--no-surrender',
  name: 'General Hux, No Terms, No Surrender',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['First Order', 'Official'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  auras: [
    {
      id: 'first-order-raid',
      filter: {
        controller: 'friendly',
        trait: 'First Order',
        otherThan: 'source',
      },
      abilities: {
        raid: 1,
      },
    },
  ],
  actions: [
    {
      id: 'first-order-draw',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'played-card-this-phase',
            filter: {
              trait: 'First Order',
            },
          },
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
