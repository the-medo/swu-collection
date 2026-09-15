import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const drengirSpawn = {
  cardId: 'drengir-spawn',
  name: 'Drengir Spawn',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Creature'],
  cost: 4,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'grow-after-defeat',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'defender-defeated',
            amount: 1,
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: {
                  kind: 'card-cost',
                  target: 'defender',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
