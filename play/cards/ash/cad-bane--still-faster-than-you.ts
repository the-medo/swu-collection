import type { LeaderDefinition } from '../definition.ts';

// ASH . V8 rules; printed text pinned in meta combat fixture.
export const cadBaneStillFasterThanYou = {
  cardId: 'cad-bane--still-faster-than-you',
  name: 'Cad Bane, Still Faster than You',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'damage-unit',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'damage-unit',
              amount: 1,
              arena: 'any',
              optional: false,
              filter: {
                remainingHpAtLeast: 2,
              },
            },
          ],
        },
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
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 7,
      arena: 'ground',
      keywords: ['Overwhelm'],
      triggers: [
        {
          id: 'on-attack',
          timing: 'attack',
          effects: [
            {
              kind: 'damage-unit',
              amount: 1,
              arena: 'any',
              optional: true,
              filter: {
                remainingHpAtLeast: 2,
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
