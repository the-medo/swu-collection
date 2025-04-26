import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TournamentTabsProps {
  tournamentId: string;
  children?: React.ReactNode;
  className?: string;
  defaultValue?: string;
}

const TournamentTabs: React.FC<TournamentTabsProps> = ({
  tournamentId,
  children,
  className,
  defaultValue = 'details',
}) => {
  return (
    <Tabs defaultValue={defaultValue} className={cn('w-full', className)}>
      <TabsList className="grid grid-cols-4 mb-6">
        <TabsTrigger value="details">Details & Bracket</TabsTrigger>
        <TabsTrigger value="meta">Meta Analysis</TabsTrigger>
        <TabsTrigger value="matchups">Matchups</TabsTrigger>
        <TabsTrigger value="decks">All Decks</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};

export default TournamentTabs;