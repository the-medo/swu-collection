import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 leader choices fixture.
export const kyloRenWeReNotDoneYet = {
  cardId: 'kylo-ren--we-re-not-done-yet',
  name: "Kylo Ren, We're Not Done Yet",
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'First Order'],
  unique: true,
  printedCost: 7,
  faces: {
    leader: {
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 7,
              },
            },
          ],
        },
        {
          id: 'upgrade-recovery',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'self',
              chooser: 'owner',
              filter: {},
              min: 1,
              max: 1,
              bind: 'discard',
              effects: [
                {
                  kind: 'move-card',
                  target: 'discard',
                  from: 'hand',
                  to: 'discard',
                  effects: [
                    {
                      kind: 'if',
                      condition: {
                        kind: 'card-matches',
                        target: 'discard',
                        filter: {
                          kind: 'upgrade',
                        },
                      },
                      effects: [
                        {
                          kind: 'draw-cards',
                          amount: 1,
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
    },
    unit: {
      power: 5,
      hp: 5,
      arena: 'ground',
      keywords: ['Sentinel'],
      triggers: [
        {
          id: 'discard-upgrades',
          timing: 'deployed',
          effects: [
            {
              kind: 'play-card',
              from: 'discard',
              filter: {
                playAs: 'upgrade',
              },
              attachTo: 'source',
              optional: true,
              repeat: true,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
