import type { UnitDefinition } from '../definition.ts';

export const greefKarga = {
  cardId: 'greef-karga--affable-commissioner',
  traits: ['Fringe', 'Official'],
  name: 'Greef Karga, Affable Commissioner',
  kind: 'unit',
  aspects: ['Heroism'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [{ kind: 'search-deck', count: 5, filter: 'upgrade', max: 1 }],
    },
  ],
} as const satisfies UnitDefinition;
