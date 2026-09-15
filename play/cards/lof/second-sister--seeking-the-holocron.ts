import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const secondSisterSeekingTheHolocron = {
  cardId: 'second-sister--seeking-the-holocron',
  name: 'Second Sister, Seeking the Holocron',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force', 'Imperial', 'Inquisitor'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'discard-to-ready',
      timing: 'attack',
      effects: [
        {
          kind: 'mill',
          player: 'self',
          count: 2,
          bind: 'milled',
          group: 'milled',
          effects: [
            {
              kind: 'select-resources',
              player: 'self',
              operation: 'ready',
              exhausted: true,
              min: {
                kind: 'zone-size',
                zone: 'discard',
                player: 'self',
                filter: {
                  inGroup: 'milled',
                  trait: 'Force',
                },
              },
              max: {
                kind: 'zone-size',
                zone: 'discard',
                player: 'self',
                filter: {
                  inGroup: 'milled',
                  trait: 'Force',
                },
              },
            },
          ],
        },
      ],
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
