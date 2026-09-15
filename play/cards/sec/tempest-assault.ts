import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 phase history and tokens fixture.
export const tempestAssault = {
  cardId: 'tempest-assault',
  name: 'Tempest Assault',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'phase-event',
        event: 'enemy-base-damaged',
      },
      effects: [
        {
          kind: 'damage-units',
          amount: 2,
          filter: {
            controller: 'enemy',
            arena: 'space',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
