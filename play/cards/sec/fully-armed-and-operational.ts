import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-history.json.
export const fullyArmedAndOperational = {
  cardId: 'fully-armed-and-operational',
  name: 'Fully Armed and Operational',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Trick'],
  cost: 1,
  keywords: ['Plot'],
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'enemy-last-action-attacked-base',
      },
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'unit',
          },
          optional: false,
          phaseAbilities: {
            keywords: ['Ambush'],
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
