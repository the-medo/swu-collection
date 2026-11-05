import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBibFortunaJabbaSMajordomo = {
  cardId: 'bib-fortuna--jabba-s-majordomo',
  name: "Bib Fortuna, Jabba's Majordomo",
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', "Twi'lek"],
  cost: 2,
  unique: true,
  power: 1,
  hp: 3,
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
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'event',
          },
          optional: false,
          discount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
