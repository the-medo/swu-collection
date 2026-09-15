import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const grandAdmiralThrawnOrchestratingHisReturn = {
  cardId: 'grand-admiral-thrawn--orchestrating-his-return',
  name: 'Grand Admiral Thrawn, Orchestrating His Return',
  kind: 'unit',
  aspects: ['Command', 'Aggression', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 7,
  power: 5,
  hp: 7,
  arena: 'ground',
  keywords: ['Support'],
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-defeated',
            target: 'defender',
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
