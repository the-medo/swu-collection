import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteArquitensAssaultCruiser = {
  cardId: 'arquitens-assault-cruiser',
  name: 'Arquitens Assault Cruiser',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Vehicle', 'Capital Ship'],
  cost: 8,
  power: 7,
  hp: 8,
  arena: 'space',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'attack-defeated-unit',
      timing: 'attack-defeated-unit',
      effects: [
        {
          kind: 'resource-card',
          target: 'subject',
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          nonLeader: true,
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
