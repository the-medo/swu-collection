export type Format = {
  id: number;
  name: string;
  description: string;
};

export const formatData: Format[] = [
  {
    id: 1,
    name: 'Premier',
    description: 'Classic constructed format. One leader, one base, 50 cards in a deck is minimum.',
  },
  {
    id: 2,
    name: 'Twin Suns',
    description:
      'Constructed format. Two leaders, one base, 80 cards in a deck is minimum (since JTL) and cannot include more than one copy of any card.',
  },
  {
    id: 3,
    name: 'Sealed play',
    description: 'Limited format. Player opens 6 booster packs and builds 30+ cards deck.',
  },
  {
    id: 4,
    name: 'Draft',
    description:
      'Limited format. Player opens 3 booster packs, drafts the opened cards and builds 30+ cards deck.',
  },
  {
    id: 5,
    name: 'Scavenger',
    description:
      'Constructed format with only common and uncommon rarity cards. Other rules vary (banned cards, rare leaders,...)',
  },
];

export const formatDataById: Record<number, Format> = {};
formatData.forEach(format => {
  formatDataById[format.id] = format;
});
