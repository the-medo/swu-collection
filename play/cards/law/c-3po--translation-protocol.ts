import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const c3PoTranslationProtocol = {
  cardId: 'c-3po--translation-protocol',
  name: 'C-3PO, Translation Protocol',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Rebel', 'Underworld', 'Droid'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'leader-trait-experience',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
            nonLeader: true,
            sharesFriendlyLeaderTrait: true,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
