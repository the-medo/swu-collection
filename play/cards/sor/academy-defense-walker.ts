import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAcademyDefenseWalker = {
  cardId: 'academy-defense-walker',
  name: 'Academy Defense Walker',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial', 'Vehicle', 'Walker'],
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            damaged: true,
          },
          bind: 'recipient',
          effects: [
            {
              kind: 'on-unit',
              target: 'recipient',
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
