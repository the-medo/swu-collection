import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const captainTarkinFullForwardAssault = {
  cardId: 'captain-tarkin--full-forward-assault',
  name: 'Captain Tarkin, Full Forward Assault',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Official'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  auras: [
    {
      id: 'full-forward',
      filter: {
        controller: 'friendly',
        trait: 'Vehicle',
      },
      power: 1,
      abilities: {
        keywords: ['Overwhelm'],
      },
    },
  ],
} as const satisfies UnitDefinition;
