import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const bibFortunaDieWannaWanga = {
  cardId: 'bib-fortuna--die-wanna-wanga-',
  name: 'Bib Fortuna, Die Wanna Wanga?',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld', "Twi'lek"],
  unique: true,
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-credits',
          amount: 1,
        },
      ],
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          trait: 'Underworld',
        },
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
