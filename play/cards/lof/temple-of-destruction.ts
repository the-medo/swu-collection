import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-choices.json.
export const templeOfDestruction = {
  cardId: 'temple-of-destruction',
  name: 'Temple of Destruction',
  kind: 'base',
  aspects: ['Aggression'],
  traits: [],
  hp: 25,
  triggers: [
    {
      id: 'combat-force',
      timing: 'friendly-combat-base-damage-dealt',
      condition: {
        kind: 'value-at-least',
        name: 'base-damage',
        amount: 3,
      },
      effects: [
        {
          kind: 'gain-force',
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
