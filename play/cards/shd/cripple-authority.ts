import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCrippleAuthority = {
  cardId: 'cripple-authority',
  name: 'Cripple Authority',
  kind: 'event',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'draw-cards',
      amount: 1,
    },
    {
      kind: 'if',
      condition: {
        kind: 'fewer-resources-than-opponent',
      },
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'move-card',
              target: 'card',
              from: 'hand',
              to: 'discard',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
