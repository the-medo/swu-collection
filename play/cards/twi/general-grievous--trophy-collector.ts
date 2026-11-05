import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGeneralGrievousTrophyCollector = {
  cardId: 'general-grievous--trophy-collector',
  name: 'General Grievous, Trophy Collector',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Separatist', 'Official'],
  cost: 3,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  ignoreAspectPenalties: [
    {
      filter: {
        trait: 'Lightsaber',
      },
      host: {
        sameAs: 'source',
      },
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'upgrades-count',
              target: 'source',
              trait: 'Lightsaber',
            },
            amount: 4,
          },
          effects: [
            {
              kind: 'select-units',
              filter: {
                controller: 'enemy',
              },
              bind: 'victims',
              min: 4,
              max: 4,
              effects: [
                {
                  kind: 'defeat-group',
                  group: 'victims',
                  countAs: 'defeated',
                  effects: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
