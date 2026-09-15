import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const payrollHeist = {
  cardId: 'payroll-heist',
  name: 'Payroll Heist',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Plan'],
  cost: 4,
  effects: [
    {
      kind: 'modify-units',
      filter: {
        controller: 'friendly',
      },
      operation: {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        abilities: {
          triggers: [
            {
              id: 'attack',
              timing: 'attack',
              effects: [
                {
                  kind: 'create-credits',
                  amount: 1,
                },
              ],
            },
          ],
        },
      },
    },
  ],
} as const satisfies EventDefinition;
