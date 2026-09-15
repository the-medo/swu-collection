import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const adiGalliaSternAndFocused = {
  cardId: 'adi-gallia--stern-and-focused',
  name: 'Adi Gallia, Stern and Focused',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'opponent-event',
      timing: 'enemy-card-played',
      effects: [
        {
          kind: 'damage-bases',
          amount: 1,
          targets: 'enemy',
        },
      ],
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: {
          kind: 'event',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
