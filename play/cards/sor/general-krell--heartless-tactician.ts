import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGeneralKrellHeartlessTactician = {
  cardId: 'general-krell--heartless-tactician',
  name: 'General Krell, Heartless Tactician',
  kind: 'unit',
  aspects: ['Command', 'Command'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 5,
  unique: true,
  power: 5,
  hp: 4,
  arena: 'ground',
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
      },
      abilities: {
        triggers: [
          {
            id: 'defeated',
            timing: 'defeated',
            effects: [
              {
                kind: 'draw-cards',
                amount: 1,
              },
            ],
            optional: true,
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
