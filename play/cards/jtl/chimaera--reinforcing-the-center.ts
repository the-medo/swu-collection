import type { UnitDefinition } from '../definition.ts';

// JTL 039. Invoke one ability on another friendly unit; this does not defeat it.
export const chimaeraReinforcingTheCenter = {
  cardId: 'chimaera--reinforcing-the-center',
  name: 'Chimaera, Reinforcing the Center',
  kind: 'unit',
  cost: 6,
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  power: 5,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'invoke-defeated',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: { controller: 'friendly', otherThan: 'source', whenDefeated: true },
          bind: 'chosen',
          optional: true,
          effects: [{ kind: 'use-defeated-ability', target: 'chosen' }],
        },
      ],
    },
    {
      id: 'create-fighters',
      timing: 'defeated',
      effects: [{ kind: 'create-unit', cardId: 'tie-fighter', count: 2 }],
    },
  ],
} as const satisfies UnitDefinition;
