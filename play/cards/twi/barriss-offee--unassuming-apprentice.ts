import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBarrissOffeeUnassumingApprentice = {
  cardId: 'barriss-offee--unassuming-apprentice',
  name: 'Barriss Offee, Unassuming Apprentice',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 1,
  unique: true,
  power: 1,
  hp: 1,
  arena: 'ground',
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        healedThisPhase: true,
      },
      power: 1,
    },
  ],
} as const satisfies UnitDefinition;
