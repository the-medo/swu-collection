import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const alexsandrKallusWithNewPurpose = {
  cardId: 'alexsandr-kallus--with-new-purpose',
  name: 'Alexsandr Kallus, With New Purpose',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Spectre'],
  unique: true,
  cost: 7,
  power: 6,
  hp: 6,
  arena: 'ground',
  auras: [
    {
      id: 'unique-raid',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
        unique: true,
        condition: {
          kind: 'initiative',
        },
      },
      abilities: {
        raid: 2,
      },
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-units',
          amount: 2,
          filter: {
            arena: 'ground',
          },
          max: 3,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
