import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const massassiTacticalOfficer = {
  cardId: 'massassi-tactical-officer',
  name: 'Massassi Tactical Officer',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel'],
  cost: 1,
  power: 0,
  hp: 4,
  arena: 'ground',
  actions: [
    {
      id: 'direct-fighter',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Fighter',
          },
          bind: 'attacker',
          optional: false,
          effects: [
            {
              kind: 'attack-bound',
              target: 'attacker',
              optional: false,
              powerBonus: 2,
              unitsOnly: false,
              evenIfExhausted: false,
            },
          ],
          forAttack: {
            unitsOnly: false,
            evenIfExhausted: false,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
