import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const phantomSpectreShuttle = {
  cardId: 'phantom--spectre-shuttle',
  name: 'Phantom, Spectre Shuttle',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport', 'Spectre'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'unit',
            aspect: 'Heroism',
          },
          optional: true,
          bind: 'played',
          effects: [
            {
              kind: 'on-unit',
              target: 'played',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
