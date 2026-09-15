import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const daggerSquadronPilot = {
  cardId: 'dagger-squadron-pilot',
  name: 'Dagger Squadron Pilot',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Pilot'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 1,
      aspects: ['Cunning', 'Heroism'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 2,
      hp: 1,
    },
  },
} as const satisfies UnitDefinition;
