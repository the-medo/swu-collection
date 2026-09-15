import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const improvise = {
  cardId: 'improvise',
  name: 'Improvise',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Gambit'],
  cost: 1,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'deck',
      player: 'self',
      chooser: 'self',
      top: 1,
      min: 1,
      max: 1,
      filter: {},
      bind: 'top',
      effects: [
        {
          kind: 'play-card',
          from: 'deck',
          target: 'top',
          filter: {},
          discount: 1,
          optional: true,
          otherwise: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'discard',
                  effects: [
                    {
                      kind: 'move-card',
                      target: 'top',
                      from: 'deck',
                      to: 'discard',
                    },
                  ],
                },
                {
                  id: 'leave',
                  effects: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
