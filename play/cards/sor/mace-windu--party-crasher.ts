import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMaceWinduPartyCrasher = {
  cardId: 'mace-windu--party-crasher',
  name: 'Mace Windu, Party Crasher',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 7,
  unique: true,
  power: 5,
  hp: 7,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'attack-defeated-unit',
      timing: 'attack-defeated-unit',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'ready',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
