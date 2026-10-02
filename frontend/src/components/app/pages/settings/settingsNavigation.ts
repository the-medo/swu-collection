import {
  BookOpen,
  CalendarDays,
  Code,
  House,
  PanelLeft,
  Plug,
  SlidersHorizontal,
  UserRound,
  Users,
} from 'lucide-react';

export const settingsItems = [
  { id: 'collections-and-wantlists', label: 'Collections and wantlists', icon: BookOpen },
  { id: 'display-name', label: 'Display name', icon: UserRound },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'watched-players', label: 'Watched players', icon: Users },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'sidebar', label: 'Sidebar', icon: PanelLeft },
  { id: 'features', label: 'Features', icon: SlidersHorizontal },
  { id: 'home-location', label: 'Home location', icon: House },
  { id: 'development', label: 'Development', icon: Code },
] as const;

export const settingsPageIds = settingsItems.map(item => item.id);
export type SettingsPageId = (typeof settingsPageIds)[number];
