import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDoctorEvazanWantedOnTwelveSystems = {
  cardId: 'doctor-evazan--wanted-on-twelve-systems',
  name: 'Doctor Evazan, Wanted on Twelve Systems',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld'],
  cost: 2,
  unique: true,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Shielded'],
  bounties: [
    {
      id: 'bounty',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: 'any',
          min: 0,
          max: 12,
          operation: 'ready',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
