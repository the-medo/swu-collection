import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Database,
  Flag,
  Group,
  Image,
  Layers,
  ListChecks,
  ScanSearch,
  Sparkles,
  UserRoundCheck,
  Wrench,
} from 'lucide-react';

export const adminSections = [
  {
    title: 'Crossfire',
    items: [
      { id: 'crossfire-access', label: 'Player access', icon: UserRoundCheck },
      { id: 'crossfire-cards', label: 'Card releases', icon: Layers },
    ],
  },
  {
    title: 'Tournaments',
    items: [
      { id: 'metas', label: 'Metas', icon: ChartNoAxesCombined },
      { id: 'tournament-groups', label: 'Groups', icon: Group },
      { id: 'tournament-weekends', label: 'Weekends', icon: CalendarDays },
      { id: 'tournament-results', label: 'Results', icon: ListChecks },
      { id: 'pq-tools', label: 'PQ tools', icon: Flag },
    ],
  },
  {
    title: 'Cards',
    items: [
      { id: 'sets', label: 'Sets', icon: Database },
      { id: 'preview-cards', label: 'Preview cards', icon: Sparkles },
      { id: 'card-prices', label: 'Prices', icon: CircleDollarSign },
      { id: 'variant-checker', label: 'Variant checker', icon: ScanSearch },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'deck-thumbnails', label: 'Deck thumbnails', icon: Image },
      { id: 'special-actions', label: 'Maintenance', icon: Wrench },
    ],
  },
] as const;

export const adminPageIds = adminSections.flatMap(section => section.items.map(item => item.id));
export type AdminPageId = (typeof adminPageIds)[number];
