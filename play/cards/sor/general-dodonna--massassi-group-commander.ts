import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetGeneralDodonnaMassassiGroupCommander = {
  cardId: 'general-dodonna--massassi-group-commander',
  name: 'General Dodonna, Massassi Group Commander',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Official'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  auras: [
    {
      id: 'friendly-rebel',
      filter: {
        controller: 'friendly',
        trait: 'Rebel',
        otherThan: 'source',
      },
      power: 1,
      hp: 1,
    },
  ],
} as const satisfies UnitDefinition;
