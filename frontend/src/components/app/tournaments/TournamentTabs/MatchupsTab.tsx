import * as React from 'react';

interface MatchupsTabProps {
  tournamentId: string;
}

const MatchupsTab: React.FC<MatchupsTabProps> = ({ tournamentId }) => {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-md border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Matchups</h3>
        <div className="bg-muted p-8 rounded-md text-center">
          <p className="text-muted-foreground">
            Tournament matchup analysis will be displayed here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MatchupsTab;