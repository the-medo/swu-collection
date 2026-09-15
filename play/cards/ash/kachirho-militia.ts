import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-phase.json.
export const kachirhoMilitia = {
  cardId: 'kachirho-militia',
  name: 'Kachirho Militia',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Wookiee', 'Trooper'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'defend-base',
      timing: 'own-base-attacked',
      limit: 'once-per-round',
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          arena: 'ground',
          controller: 'enemy',
        },
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
} as const satisfies UnitDefinition;
