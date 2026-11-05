import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAFineAddition = {
  cardId: 'a-fine-addition',
  name: 'A Fine Addition',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Supply'],
  cost: 0,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'unit-history-at-least',
        event: 'defeated',
        player: 'enemy',
        amount: 1,
      },
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'from-hand',
              effects: [
                {
                  kind: 'play-card',
                  from: 'hand',
                  filter: {
                    kind: 'upgrade',
                  },
                  optional: false,
                  ignoreAspectPenalties: true,
                },
              ],
            },
            {
              id: 'from-own-discard',
              effects: [
                {
                  kind: 'play-card',
                  from: 'discard',
                  filter: {
                    kind: 'upgrade',
                  },
                  optional: false,
                  ignoreAspectPenalties: true,
                },
              ],
            },
            {
              id: 'from-enemy-discard',
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'discard',
                  player: 'enemy',
                  chooser: 'self',
                  filter: {
                    kind: 'upgrade',
                  },
                  min: 1,
                  max: 1,
                  bind: 'card',
                  effects: [
                    {
                      kind: 'play-card',
                      from: 'discard',
                      filter: {
                        kind: 'upgrade',
                      },
                      optional: false,
                      target: 'card',
                      ignoreAspectPenalties: true,
                      takeControl: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
