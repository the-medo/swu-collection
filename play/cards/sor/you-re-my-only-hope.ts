import type { EventDefinition } from '../definition.ts';

// Reprinted in IC27 194; identity and text follow the official catalog.
export const ic27ReprintYouReMyOnlyHope = {
  cardId: 'you-re-my-only-hope',
  name: "You're My Only Hope",
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Gambit'],
  cost: 3,
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
      bind: 'top',
      effects: [
        {
          kind: 'if',
          condition: { kind: 'own-base-remaining-hp-at-most', amount: 5 },
          effects: [
            {
              kind: 'choose-mode',
              private: true,
              options: [
                {
                  id: 'play-free',
                  effects: [
                    {
                      kind: 'play-card',
                      from: 'deck',
                      target: 'top',
                      filter: {},
                      free: true,
                      optional: true,
                      preserveOptionalChoice: true,
                    },
                  ],
                },
                {
                  id: 'play-discounted',
                  effects: [
                    {
                      kind: 'play-card',
                      from: 'deck',
                      target: 'top',
                      filter: {},
                      discount: 5,
                      optional: true,
                      preserveOptionalChoice: true,
                    },
                  ],
                },
              ],
            },
          ],
          otherwise: [
            {
              kind: 'play-card',
              from: 'deck',
              target: 'top',
              filter: {},
              discount: 5,
              optional: true,
              preserveOptionalChoice: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
