import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFinnOnTheRun = {
  cardId: 'finn--on-the-run',
  name: 'Finn, On the Run',
  kind: 'unit',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Fringe', 'Trooper'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            unique: true,
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                preventDamage: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
