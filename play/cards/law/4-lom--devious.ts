import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const card4LomDevious = {
  cardId: '4-lom--devious',
  name: '4-LOM, Devious',
  kind: 'unit',
  aspects: ['Command', 'Cunning', 'Villainy'],
  traits: ['Underworld', 'Droid', 'Bounty Hunter'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'hunter-attack',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          forAttack: { unitsOnly: true, evenIfExhausted: true },
          filter: {
            controller: 'friendly',
            trait: 'Bounty Hunter',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              unitsOnly: true,
              evenIfExhausted: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
