import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const emperorSMessenger = {
  cardId: 'emperor-s-messenger',
  name: "Emperor's Messenger",
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial', 'Droid'],
  cost: 1,
  power: 0,
  hp: 3,
  arena: 'ground',
  keywords: ['Support'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: true,
          min: 1,
          max: 1,
          operation: 'ready',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
