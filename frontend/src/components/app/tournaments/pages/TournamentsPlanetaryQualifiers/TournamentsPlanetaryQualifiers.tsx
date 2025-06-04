import * as React from 'react';
import TournamentPageHeader from '@/components/app/tournaments/TournamentPageHeader';
import TournamentNavigation from '@/components/app/tournaments/TournamentNavigation/TournamentNavigation.tsx';

interface TournamentsPlanetaryQualifiersProps {}

const TournamentsPlanetaryQualifiers: React.FC<TournamentsPlanetaryQualifiersProps> = ({}) => {
  return (
    <>
      <TournamentNavigation />
      <TournamentPageHeader title="Tournaments" />
      <div className="p-8 text-center text-gray-500">
        <p>Planetary Qualifiers content coming soon.</p>
      </div>
    </>
  );
};

export default TournamentsPlanetaryQualifiers;
