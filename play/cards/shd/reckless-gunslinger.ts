import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRecklessGunslinger = {
  cardId: 'reckless-gunslinger',
  name: 'Reckless Gunslinger',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 3,
      aspects: ['Aggression'],
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-bases',
          targets: 'each',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
