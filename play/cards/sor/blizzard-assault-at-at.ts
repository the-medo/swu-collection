import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBlizzardAssaultAtAt = {
  cardId: 'blizzard-assault-at-at',
  name: 'Blizzard Assault AT-AT',
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial', 'Vehicle', 'Walker'],
  cost: 8,
  power: 9,
  hp: 9,
  arena: 'ground',
  triggers: [
    {
      id: 'attack-defeated-unit',
      timing: 'attack-defeated-unit',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: {
                kind: 'value',
                name: 'attack-excess',
              },
            },
          ],
        },
      ],
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
