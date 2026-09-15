import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const daringDelve = {
  cardId: 'daring-delve',
  name: 'Daring Delve',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Gambit'],
  cost: 1,
  effects: [
    {
      kind: 'mill',
      player: 'self',
      count: 2,
      bind: 'first',
      group: 'milled',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'owner',
          filter: {
            inGroup: 'milled',
            aspect: 'Aggression',
          },
          min: 0,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen',
              from: 'discard',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
