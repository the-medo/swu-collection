import { Crown, Layers3, Library, RectangleVertical, Shield, Trophy } from 'lucide-react';

export const connectionTypes = [
  { type: 'card', label: 'Card', icon: RectangleVertical },
  { type: 'leader', label: 'Leader', icon: Crown },
  { type: 'base', label: 'Base', icon: Shield },
  { type: 'deck', label: 'Deck', icon: Layers3 },
  { type: 'tournament', label: 'Tournament', icon: Trophy },
  { type: 'set', label: 'Set', icon: Library },
] as const;
