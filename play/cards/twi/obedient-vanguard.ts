import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteObedientVanguard = {
  cardId: 'obedient-vanguard',
  name: 'Obedient Vanguard',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Separatist', 'Droid', 'Trooper'],
  cost: 1,
  power: 1,
  hp: 1,
  arena: 'ground',
  raid: 1,
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            trait: 'Trooper',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
