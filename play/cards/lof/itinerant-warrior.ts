import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const itinerantWarrior = {
  cardId: 'itinerant-warrior',
  name: 'Itinerant Warrior',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'force-heal',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'heal-base',
              amount: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
