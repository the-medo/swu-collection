import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const leiaOrganaPilotsToYourStations = {
  cardId: 'leia-organa--pilots--to-your-stations',
  name: 'Leia Organa, Pilots, To Your Stations',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Official'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  restore: 1,
  triggers: [
    {
      id: 'pilot-attack',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            anyOf: [
              {
                trait: 'Pilot',
              },
              {
                upgradeTrait: 'Pilot',
              },
            ],
          },
          bind: 'attacker',
          optional: true,
          effects: [
            {
              kind: 'attack-bound',
              target: 'attacker',
              optional: false,
              powerBonus: 1,
              abilities: {
                restore: 1,
              },
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
