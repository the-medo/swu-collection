import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const knobbyWhiteIceSpider = {
  cardId: 'knobby-white-ice-spider',
  name: 'Knobby White Ice Spider',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Creature'],
  cost: 7,
  power: 5,
  hp: 7,
  arena: 'ground',
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'advantage',
            count: {
              kind: 'unit-count',
              filter: {
                controller: 'enemy',
              },
            },
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
