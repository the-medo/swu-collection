import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const monMothmaFormingACoalition = {
  cardId: 'mon-mothma--forming-a-coalition',
  name: 'Mon Mothma, Forming a Coalition',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Official'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      ignoreAspectPenalties: [
        {
          filter: {
            kind: 'unit',
            trait: 'Official',
            withoutAspect: 'Villainy',
          },
        },
      ],
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 7,
      arena: 'ground',
      ignoreAspectPenalties: [
        {
          filter: {
            kind: 'unit',
            trait: 'Official',
            withoutAspect: 'Villainy',
          },
        },
      ],
      auras: [
        {
          id: 'officials',
          filter: {
            controller: 'friendly',
            trait: 'Official',
            otherThan: 'source',
          },
          hp: 1,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
