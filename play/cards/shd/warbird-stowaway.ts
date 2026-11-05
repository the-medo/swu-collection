import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWarbirdStowaway = {
  cardId: 'warbird-stowaway',
  name: 'Warbird Stowaway',
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Underworld'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 4,
      aspects: ['Command', 'Villainy'],
    },
  ],
  constant: [
    {
      condition: {
        kind: 'initiative',
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
