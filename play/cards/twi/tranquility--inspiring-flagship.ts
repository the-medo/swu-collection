import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTranquilityInspiringFlagship = {
  cardId: 'tranquility--inspiring-flagship',
  name: 'Tranquility, Inspiring Flagship',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Vehicle', 'Capital Ship'],
  cost: 7,
  unique: true,
  power: 7,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'owner',
          filter: {
            kind: 'unit',
            trait: 'Republic',
          },
          min: 0,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'move-card',
              target: 'card',
              from: 'discard',
              to: 'hand',
            },
          ],
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'next-play',
          filter: {
            trait: 'Republic',
          },
          discount: 1,
          uses: 3,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
