import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDoctorPershingExperimentingWithLife = {
  cardId: 'doctor-pershing--experimenting-with-life',
  name: 'Doctor Pershing, Experimenting With Life',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial'],
  cost: 2,
  unique: true,
  power: 0,
  hp: 5,
  arena: 'ground',
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'exhaust-self',
        },
        {
          kind: 'damage-friendly-unit',
          amount: 1,
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
