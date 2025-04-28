import * as React from 'react';
import { useEffect } from 'react';
import {
  useTournamentMetaActions,
  useTournamentMetaStore,
} from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import TournamentDataLoader from '@/components/app/tournaments/TournamentMeta/TournamentDataLoader.tsx';
import TournamentMetaAnalyzer from '@/components/app/tournaments/TournamentMeta/TournamentMetaAnalyzer.tsx';

interface TournamentMetaProps {
  tournamentIds: string[];
}

const TournamentMeta: React.FC<TournamentMetaProps> = ({ tournamentIds }) => {
  const { decks, tournaments } = useTournamentMetaStore();
  const { setTournamentIds } = useTournamentMetaActions();

  useEffect(() => {
    setTournamentIds(tournamentIds);
  }, [tournamentIds]);

  return (
    <>
      {tournamentIds.map(tid => (
        <TournamentDataLoader tournamentId={tid} key={tid} />
      ))}
      <TournamentMetaAnalyzer decks={decks} tournaments={tournaments} />
    </>
  );
};

export default TournamentMeta;
