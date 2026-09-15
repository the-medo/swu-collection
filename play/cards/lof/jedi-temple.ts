import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const jediTemple = {
  cardId: 'jedi-temple',
  kind: 'base',
  name: 'Jedi Temple',
  aspects: ['Command'],
  traits: [],
  hp: 28,
  triggers: [
    {
      id: 'force-attack',
      timing: 'friendly-attack',
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          trait: 'Force',
        },
      },
      effects: [
        {
          kind: 'gain-force',
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
