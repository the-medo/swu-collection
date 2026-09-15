import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const mazKanataTheLightGuides = {
  cardId: 'maz-kanata--the-light-guides',
  name: 'Maz Kanata, The Light Guides',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'force-attack',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          forAttack: {},
          filter: {
            controller: 'friendly',
            trait: 'Force',
            exhausted: false,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              powerBonus: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
