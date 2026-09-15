import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const nalaSeCloneEngineer = {
  cardId: 'nala-se--clone-engineer',
  name: 'Nala Se, Clone Engineer',
  kind: 'leader',
  aspects: ['Villainy', 'Vigilance'],
  traits: [],
  unique: true,
  printedCost: 4,
  faces: {
    leader: {
      ignoreAspectPenalties: [
        {
          filter: {
            kind: 'unit',
            trait: 'Clone',
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
                amount: 4,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 1,
      hp: 7,
      arena: 'ground',
      ignoreAspectPenalties: [
        {
          filter: {
            kind: 'unit',
            trait: 'Clone',
          },
        },
      ],
      auras: [
        {
          id: 'clone-healing',
          filter: {
            controller: 'friendly',
            trait: 'Clone',
          },
          abilities: {
            triggers: [
              {
                id: 'clone-defeated',
                timing: 'defeated',
                effects: [
                  {
                    kind: 'heal-own-base',
                    amount: 2,
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
