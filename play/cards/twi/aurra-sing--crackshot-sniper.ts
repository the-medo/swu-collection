import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAurraSingCrackshotSniper = {
  cardId: 'aurra-sing--crackshot-sniper',
  name: 'Aurra Sing, Crackshot Sniper',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 7,
  unique: true,
  power: 7,
  hp: 6,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'own-base-attacked',
      timing: 'own-base-attacked',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'ready',
          },
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          controller: 'enemy',
          arena: 'ground',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
