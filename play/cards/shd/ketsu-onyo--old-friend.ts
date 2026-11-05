import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKetsuOnyoOldFriend = {
  cardId: 'ketsu-onyo--old-friend',
  name: 'Ketsu Onyo, Old Friend',
  kind: 'unit',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Mandalorian', 'Underworld', 'Bounty Hunter'],
  cost: 2,
  unique: true,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'combat-base-damage-dealt',
      timing: 'combat-base-damage-dealt',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            maxCost: 2,
          },
          min: 0,
          max: 1,
          bind: 'upgrades',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'upgrades',
              to: 'discard',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
