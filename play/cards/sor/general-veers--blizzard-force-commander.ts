import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetGeneralVeersBlizzardForceCommander = {
  cardId: 'general-veers--blizzard-force-commander',
  name: 'General Veers, Blizzard Force Commander',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Official'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 3,
  arena: 'ground',
  auras: [
    {
      id: 'friendly-imperial',
      filter: {
        controller: 'friendly',
        trait: 'Imperial',
        otherThan: 'source',
      },
      power: 1,
      hp: 1,
    },
  ],
} as const satisfies UnitDefinition;
