import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFavorableDelegate = {
  cardId: 'favorable-delegate',
  name: 'Favorable Delegate',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Republic', 'Official'],
  cost: 2,
  power: 1,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
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
} as const satisfies UnitDefinition;
