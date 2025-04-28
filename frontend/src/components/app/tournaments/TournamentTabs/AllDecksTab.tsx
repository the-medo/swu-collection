import * as React from 'react';

interface AllDecksTabProps {
  tournamentId: string;
}

const AllDecksTab: React.FC<AllDecksTabProps> = ({ tournamentId }) => {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-md border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">All Decks</h3>
        <div className="bg-muted p-8 rounded-md text-center">
          <p className="text-muted-foreground">
            All tournament decks with additional filters will be displayed here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AllDecksTab;
