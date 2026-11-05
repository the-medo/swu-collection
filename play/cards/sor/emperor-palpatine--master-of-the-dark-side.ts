import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEmperorPalpatineMasterOfTheDarkSide = {
  cardId: 'emperor-palpatine--master-of-the-dark-side',
  name: 'Emperor Palpatine, Master of the Dark Side',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Sith', 'Official'],
  cost: 8,
  unique: true,
  power: 6,
  hp: 6,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'divide-damage',
          amount: 6,
          filter: {
            controller: 'enemy',
          },
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
