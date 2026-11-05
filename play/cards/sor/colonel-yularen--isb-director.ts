import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteColonelYularenIsbDirector = {
  cardId: 'colonel-yularen--isb-director',
  name: 'Colonel Yularen, ISB Director',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Imperial', 'Official'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'friendly-played',
      timing: 'friendly-played',
      effects: [
        {
          kind: 'heal-own-base',
          amount: 1,
        },
      ],
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: {
          kind: 'unit',
          aspect: 'Command',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
