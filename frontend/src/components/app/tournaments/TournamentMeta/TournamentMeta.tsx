import * as React from 'react';
import { useTournamentMetaStore } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import TournamentMetaAnalyzer from '@/components/app/tournaments/TournamentMeta/TournamentMetaAnalyzer.tsx';

interface TournamentMetaProps {}

const TournamentMeta: React.FC<TournamentMetaProps> = () => {
  const { decks, tournaments } = useTournamentMetaStore();

  return (
    <>
      <TournamentMetaAnalyzer decks={decks} tournaments={tournaments} />
    </>
  );
};

export default TournamentMeta;
