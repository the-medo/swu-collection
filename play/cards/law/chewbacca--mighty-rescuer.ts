import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const chewbaccaMightyRescuer = {
  cardId: 'chewbacca--mighty-rescuer',
  name: 'Chewbacca, Mighty Rescuer',
  kind: 'unit',
  aspects: ['Vigilance', 'Command', 'Heroism'],
  traits: ['Rebel', 'Wookiee'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'rescue',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'defender-defeated',
            amount: 1,
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'heal',
                amount: 3,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
