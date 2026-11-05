import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOsiSobeckWardenOfTheCitadel = {
  cardId: 'osi-sobeck--warden-of-the-citadel',
  name: 'Osi Sobeck, Warden of the Citadel',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Separatist'],
  cost: 6,
  unique: true,
  power: 3,
  hp: 6,
  arena: 'ground',
  exploit: 3,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            arena: 'ground',
            maxCost: {
              kind: 'resources-paid',
              target: 'source',
            },
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'capture-unit',
              guard: 'source',
              target: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
