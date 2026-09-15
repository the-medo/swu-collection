import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const directorKrennicAspiringToAuthority = {
  cardId: 'director-krennic--aspiring-to-authority',
  name: 'Director Krennic, Aspiring to Authority',
  kind: 'leader',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial', 'Official'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      auras: [
        {
          id: 'damaged',
          filter: {
            controller: 'friendly',
            damaged: true,
          },
          power: 1,
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
      power: 2,
      hp: 7,
      arena: 'ground',
      restore: 2,
      auras: [
        {
          id: 'damaged',
          filter: {
            controller: 'friendly',
            damaged: true,
          },
          power: 1,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
