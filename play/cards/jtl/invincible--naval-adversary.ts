import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const invincibleNavalAdversary = {
  cardId: 'invincible--naval-adversary',
  name: 'Invincible, Naval Adversary',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 6,
  power: 6,
  hp: 6,
  arena: 'space',
  costReductions: [
    {
      condition: {
        kind: 'cards-in-play-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Separatist',
          unique: true,
          roles: ['leader', 'unit', 'upgrade'],
        },
        amount: 1,
      },
      amount: 1,
    },
  ],
  triggers: [
    {
      id: 'leader-deployed-return',
      timing: 'leader-deployed',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
            maxCost: 3,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
