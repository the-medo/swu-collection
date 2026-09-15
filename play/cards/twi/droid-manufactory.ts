import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const droidManufactory = {
  cardId: 'droid-manufactory',
  kind: 'base',
  name: 'Droid Manufactory',
  aspects: ['Command'],
  traits: [],
  hp: 24,
  triggers: [
    {
      id: 'leader-deployment',
      timing: 'leader-deployed',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'battle-droid',
          count: 2,
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
