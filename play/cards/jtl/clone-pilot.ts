import type { UnitDefinition } from '../definition.ts';

export const clonePilot = {
  cardId: 'clone-pilot',
  name: 'Clone Pilot',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Clone', 'Pilot'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  piloting: [{ id: 'piloting', cost: 2, aspects: ['Command'] }],
  upgrade: { attachTo: 'friendly-vehicle-without-pilot', modifiers: { power: 2, hp: 2 } },
} as const satisfies UnitDefinition;
