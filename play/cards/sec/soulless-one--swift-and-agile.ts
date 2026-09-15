import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const soullessOneSwiftAndAgile = {
  cardId: 'soulless-one--swift-and-agile',
  name: 'Soulless One, Swift and Agile',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Cunning', 'Cunning', 'Villainy'],
          effects: [
            {
              kind: 'select-resources',
              player: 'self',
              exhausted: true,
              min: 2,
              max: 2,
              operation: 'ready',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
