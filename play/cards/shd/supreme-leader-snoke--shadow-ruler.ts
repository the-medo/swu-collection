import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSupremeLeaderSnokeShadowRuler = {
  cardId: 'supreme-leader-snoke--shadow-ruler',
  name: 'Supreme Leader Snoke, Shadow Ruler',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'First Order', 'Official'],
  cost: 8,
  unique: true,
  power: 6,
  hp: 6,
  arena: 'ground',
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'enemy',
        nonLeader: true,
      },
      power: -2,
      hp: -2,
    },
  ],
} as const satisfies UnitDefinition;
