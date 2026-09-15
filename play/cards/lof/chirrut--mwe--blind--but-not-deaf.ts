import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const chirrutMweBlindButNotDeaf = {
  cardId: 'chirrut--mwe--blind--but-not-deaf',
  name: 'Chirrut Îmwe, Blind, but not Deaf',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Force', 'Fringe'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'force-defense',
      timing: 'attacked',
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
              kind: 'on-unit',
              target: 'attacker',
              operation: {
                kind: 'modify',
                power: -2,
                hp: 0,
                duration: 'attack',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
