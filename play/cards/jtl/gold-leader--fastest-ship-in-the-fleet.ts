import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const goldLeaderFastestShipInTheFleet = {
  cardId: 'gold-leader--fastest-ship-in-the-fleet',
  name: 'Gold Leader, Fastest Ship in the Fleet',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'space',
  keywords: ['Shielded'],
  auras: [
    {
      id: 'reduce-attacker',
      filter: {
        attackingAgainst: {
          sameAs: 'source',
        },
      },
      power: -1,
    },
  ],
} as const satisfies UnitDefinition;
