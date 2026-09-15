import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const bodhiRookCreatingADiversion = {
  cardId: 'bodhi-rook--creating-a-diversion',
  name: 'Bodhi Rook, Creating a Diversion',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Rebel',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Sentinel'],
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
