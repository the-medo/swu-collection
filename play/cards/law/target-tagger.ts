import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const targetTagger = {
  cardId: 'target-tagger',
  name: 'Target Tagger',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Bounty Hunter'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          forAttack: {},
          filter: {
            controller: 'friendly',
            exhausted: false,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'unit-matches',
                target: 'chosen',
                filter: {
                  trait: 'Bounty Hunter',
                },
              },
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  optional: false,
                  powerBonus: 2,
                },
              ],
              otherwise: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  optional: false,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
