import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 optional triggers fixture.
export const sebulbaSPodracerTakingTheLead = {
  cardId: 'sebulba-s-podracer--taking-the-lead',
  name: "Sebulba's Podracer, Taking the Lead",
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Vehicle', 'Speeder'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'discard-ready',
      timing: 'own-deck-card-discarded',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'ready',
          },
        },
      ],
      optional: true,
      limit: 'once-per-round',
    },
  ],
} as const satisfies UnitDefinition;
