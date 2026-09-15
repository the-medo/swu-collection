import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-finale.json.
export const asIHaveForeseen = {
  cardId: 'as-i-have-foreseen',
  name: 'As I Have Foreseen',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'deck',
      player: 'self',
      chooser: 'self',
      top: 1,
      filter: {},
      min: 1,
      max: 1,
      bind: 'foreseen',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'play-card',
              from: 'deck',
              target: 'foreseen',
              filter: {},
              discount: 4,
              optional: false,
            },
          ],
        },
      ],
      otherwise: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'play-card',
              from: 'deck',
              target: 'foreseen',
              filter: {},
              discount: 4,
              optional: false,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
