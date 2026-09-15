import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const tradeFederationDelegates = {
  cardId: 'trade-federation-delegates',
  name: 'Trade Federation Delegates',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Republic', 'Official'],
  cost: 5,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'spy',
          count: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
