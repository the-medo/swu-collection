import type { UnitDefinition } from '../definition.ts';

// Text is pinned in meta-attack-outcomes; v8 end-of-attack timing applies.
export const theGreatMothersWithStrangeMagicks = {
  cardId: 'the-great-mothers--with-strange-magicks',
  name: 'The Great Mothers, With Strange Magicks',
  aspects: ['Command', 'Villainy'],
  traits: ['Force', 'Night'],
  cost: 7,
  power: 6,
  hp: 7,
  kind: 'unit',
  arena: 'ground',
  keywords: ['Support'],
  triggers: [
    {
      id: 'finish-damaged-units',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'defeat-group',
          group: 'combat-units',
          countAs: 'defeated',
          effects: [],
        },
      ],
    },
  ],
  unique: true,
} as const satisfies UnitDefinition;
