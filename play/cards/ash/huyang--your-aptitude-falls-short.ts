import type { UnitDefinition } from '../definition.ts';

// ASH . Printed text is pinned in the meta effects fixture.
export const huyangYourAptitudeFallsShort = {
  cardId: 'huyang--your-aptitude-falls-short',
  name: 'Huyang, Your Aptitude Falls Short',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Jedi', 'Droid'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            upgraded: true,
          },
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -4,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
