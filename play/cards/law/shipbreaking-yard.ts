import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-choices.json.
export const shipbreakingYard = {
  cardId: 'shipbreaking-yard',
  name: 'Shipbreaking Yard',
  kind: 'base',
  aspects: ['Aggression'],
  traits: [],
  hp: 26,
  actions: [
    {
      id: 'epic',
      costs: [],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'mill',
          player: 'self',
          count: 3,
          bind: 'first',
          group: 'milled',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'discard',
              player: 'self',
              chooser: 'self',
              filter: {
                inGroup: 'milled',
              },
              min: 0,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'move-card',
                  target: 'chosen',
                  from: 'discard',
                  to: 'deck-top',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
