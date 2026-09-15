import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const captainEnochCaptainOfTheGuard = {
  cardId: 'captain-enoch--captain-of-the-guard',
  name: 'Captain Enoch, Captain of the Guard',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  unique: true,
  cost: 3,
  power: 1,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'zone-size',
        zone: 'discard',
        player: 'self',
        filter: {
          kind: 'unit',
          trait: 'Trooper',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
