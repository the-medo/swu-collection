import type { UnitDefinition } from '../definition.ts';

export const astromechPilot = {
  cardId: 'astromech-pilot',
  name: 'Astromech Pilot',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Droid', 'Pilot'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  piloting: [{ id: 'piloting', cost: 2, aspects: ['Vigilance'] }],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: { power: 1, hp: 3 },
    triggers: [
      {
        id: 'when-played-as-upgrade',
        timing: 'played',
        effects: [{ kind: 'heal-unit', amount: 2, optional: true }],
      },
    ],
  },
} as const satisfies UnitDefinition;
