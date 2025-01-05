import { SwuSet } from './SwuSet.ts';

export type CollectionCard = {
  set: SwuSet;
  setNumber: number;
  owned: number;
  foil?: boolean;
  hyperspace?: boolean;
};

export const fakeCollectionCards: CollectionCard[] = [
  { set: SwuSet.SHD, setNumber: 111, owned: 2, foil: true },
  { set: SwuSet.SOR, setNumber: 222, owned: 5, foil: true, hyperspace: true },
  { set: SwuSet.TWI, setNumber: 133, owned: 1 },
  { set: SwuSet.SHD, setNumber: 144, owned: 3, hyperspace: true },
  { set: SwuSet.SOR, setNumber: 55, owned: 6, foil: true },
  { set: SwuSet.TWI, setNumber: 66, owned: 3, foil: true, hyperspace: true },
  { set: SwuSet.SHD, setNumber: 77, owned: 4 },
  { set: SwuSet.SOR, setNumber: 88, owned: 7, hyperspace: true },
  { set: SwuSet.TWI, setNumber: 99, owned: 2, foil: true },
  { set: SwuSet.SHD, setNumber: 100, owned: 1, foil: true, hyperspace: true },
];
