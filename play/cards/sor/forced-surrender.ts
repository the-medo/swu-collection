import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteForcedSurrender = {
  cardId: 'forced-surrender',
  name: 'Forced Surrender',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Plan'],
  cost: 6,
  effects: [
    {
      kind: 'draw-cards',
      amount: 2,
    },
    {
      kind: 'if',
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'phase-count',
          event: 'enemy-base-damage',
          player: 'self',
        },
        amount: 1,
      },
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'owner',
          filter: {},
          min: 2,
          max: 2,
          bind: 'card',
          effects: [
            {
              kind: 'move-cards',
              group: 'selected-cards',
              from: 'hand',
              to: 'discard',
              discardBy: 'owner',
            },
          ],
          group: 'selected-cards',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
