import { ic27Unit } from './define.ts';

export const ic27K2soEvacuateTheVaultDoor = ic27Unit('k-2so--evacuate-the-vault-door', {
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'damage-units',
          filter: {
            controller: 'enemy',
          },
          bases: 'enemy',
          amount: 5,
        },
      ],
    },
  ],
});
