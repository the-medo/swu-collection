import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRoyalGuardAttach = {
  cardId: 'royal-guard-attach-',
  name: 'Royal Guard Attaché',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Naboo', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-target',
          target: 'source',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
