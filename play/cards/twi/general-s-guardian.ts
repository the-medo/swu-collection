import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGeneralSGuardian = {
  cardId: 'general-s-guardian',
  name: "General's Guardian",
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Separatist', 'Droid'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attacked',
      timing: 'attacked',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'battle-droid',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
