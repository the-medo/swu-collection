import type { Aspect, LeaderDefinition } from '../definition.ts';
const aspects = [
  'Vigilance',
  'Command',
  'Aggression',
  'Cunning',
  'Heroism',
  'Villainy',
] as const satisfies readonly Aspect[];
export const landoCalrissianFullSabacc = {
  cardId: 'lando-calrissian--full-sabacc',
  name: 'Lando Calrissian, Full Sabacc',
  kind: 'leader',
  printedCost: 6,
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld'],
  faces: {
    leader: {
      actions: [
        {
          id: 'wager',
          costs: [{ kind: 'resources', amount: 1 }, { kind: 'exhaust-self' }],
          limit: null,
          effects: [
            {
              kind: 'choose-mode',
              options: aspects.map(aspect => ({
                id: aspect,
                effects: [
                  {
                    kind: 'choose-mode',
                    options: (['self', 'enemy'] as const).map(player => ({
                      id: player === 'self' ? 'your-deck' : 'opponent-deck',
                      effects: [
                        {
                          kind: 'mill',
                          player,
                          count: 1,
                          bind: 'discarded',
                          effects: [
                            {
                              kind: 'if',
                              condition: {
                                kind: 'card-matches',
                                target: 'discarded',
                                filter: { aspect },
                              },
                              effects: [{ kind: 'create-credits', amount: 1 }],
                            },
                          ],
                        },
                      ],
                    })),
                  },
                ],
              })),
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            { kind: 'deploy', as: 'unit', condition: { kind: 'resources-at-least', amount: 6 } },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'deployed-credits',
          timing: 'deployed',
          effects: [
            {
              kind: 'defeat-credit',
              controller: 'self',
              optional: true,
              effects: [{ kind: 'create-credits', amount: 3 }],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
