import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWolffeSuspiciousVeteran = {
  cardId: 'wolffe--suspicious-veteran',
  name: 'Wolffe, Suspicious Veteran',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Fringe', 'Clone'],
  cost: 2,
  unique: true,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'prevent-base-healing',
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'prevent-base-healing',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
