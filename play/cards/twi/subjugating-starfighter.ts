import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSubjugatingStarfighter = {
  cardId: 'subjugating-starfighter',
  name: 'Subjugating Starfighter',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Separatist', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 3,
  arena: 'space',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'initiative',
          },
          effects: [
            {
              kind: 'create-unit',
              cardId: 'battle-droid',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
