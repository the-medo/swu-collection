import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const hopefulVolunteer = {
  cardId: 'hopeful-volunteer',
  name: 'Hopeful Volunteer',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Pilot'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Heroism'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 1,
      hp: 3,
    },
  },
} as const satisfies UnitDefinition;
