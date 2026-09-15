import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const malakiliLovingRancorKeeper = {
  cardId: 'malakili--loving-rancor-keeper',
  name: 'Malakili, Loving Rancor Keeper',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  playReductions: [
    {
      id: 'first-creature',
      filter: {
        kind: 'unit',
        trait: 'Creature',
      },
      amount: 1,
      firstEachPhase: true,
    },
  ],
  damageReplacements: [
    {
      id: 'protect-from-friendly-creatures',
      target: 'friendly',
      friendlySourceTrait: 'Creature',
      operation: 'prevent',
      amount: 'all',
    },
  ],
} as const satisfies UnitDefinition;
