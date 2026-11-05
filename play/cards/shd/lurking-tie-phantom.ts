import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLurkingTiePhantom = {
  cardId: 'lurking-tie-phantom',
  name: 'Lurking TIE Phantom',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 2,
  arena: 'space',
  raid: 2,
  enemyAbilityImmunity: ['capture', 'defeat'],
  damageReplacements: [
    {
      id: 'protection',
      target: 'self',
      operation: 'prevent',
      amount: 'all',
      enemyAbilityOnly: true,
    },
  ],
} as const satisfies UnitDefinition;
