import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheClientDictatedByDiscretion = {
  cardId: 'the-client--dictated-by-discretion',
  name: 'The Client, Dictated by Discretion',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial', 'Official'],
  cost: 3,
  unique: true,
  power: 2,
  hp: 5,
  arena: 'ground',
  keywords: ['Shielded'],
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  bounties: [
                    {
                      id: 'bounty',
                      effects: [
                        {
                          kind: 'select-target',
                          bases: 'any',
                          bind: 'chosen',
                          optional: false,
                          effects: [
                            {
                              kind: 'heal-target',
                              target: 'chosen',
                              amount: 5,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
