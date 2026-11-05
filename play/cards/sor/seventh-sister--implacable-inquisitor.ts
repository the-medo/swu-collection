import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSeventhSisterImplacableInquisitor = {
  cardId: 'seventh-sister--implacable-inquisitor',
  name: 'Seventh Sister, Implacable Inquisitor',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Inquisitor'],
  cost: 5,
  unique: true,
  power: 3,
  hp: 6,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'combat-base-damage-dealt',
      timing: 'combat-base-damage-dealt',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
