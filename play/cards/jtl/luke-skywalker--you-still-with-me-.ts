import type { UnitDefinition } from '../definition.ts';

// JTL 094. Only the upgrade face replaces defeat; conversion is neither entry nor play.
export const lukeSkywalkerYouStillWithMe = {
  cardId: 'luke-skywalker--you-still-with-me-',
  name: 'Luke Skywalker, You Still With Me?',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Rebel', 'Pilot'],
  unique: true,
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  piloting: [{ id: 'piloting', cost: 3, aspects: ['Command', 'Heroism'] }],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: { power: 3, hp: 2 },
    defeatToUnit: true,
  },
} as const satisfies UnitDefinition;
