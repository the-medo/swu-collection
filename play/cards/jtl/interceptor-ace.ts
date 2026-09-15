import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const interceptorAce = {
  cardId: 'interceptor-ace',
  name: 'Interceptor Ace',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Pilot'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Grit'],
  piloting: [
    {
      id: 'piloting',
      cost: 3,
      aspects: ['Vigilance', 'Villainy'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 2,
      hp: 3,
    },
    grants: {
      keywords: ['Grit'],
    },
  },
} as const satisfies UnitDefinition;
