import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const grandMoffTarkinTakingKrennicSAchievement = {
  cardId: 'grand-moff-tarkin--taking-krennic-s-achievement',
  name: "Grand Moff Tarkin, Taking Krennic's Achievement",
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 6,
  power: 2,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            trait: 'Vehicle',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'take-control',
                player: 'self',
                returnWhen: 'source-leaves',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
