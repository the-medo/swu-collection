import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-passives.json.
export const cassianAndorLayLow = {
  cardId: 'cassian-andor--lay-low',
  name: 'Cassian Andor, Lay Low',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Fringe'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  auras: [
    {
      id: 'defending',
      filter: {
        attackingAgainst: {
          sameAs: 'source',
        },
      },
      power: -2,
    },
  ],
  damageReplacements: [
    {
      id: 'ability-damage',
      target: 'self',
      operation: 'prevent',
      amount: 2,
      enemyAbilityOnly: true,
    },
  ],
} as const satisfies UnitDefinition;
