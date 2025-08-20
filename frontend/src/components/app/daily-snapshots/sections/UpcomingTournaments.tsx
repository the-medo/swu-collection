import * as React from 'react';

export interface UpcomingTournamentsProps {
  payload: any;
}

const UpcomingTournaments: React.FC<UpcomingTournamentsProps> = ({ payload }) => {
  return (
    <div className="h-full w-full">
      <div className="text-sm font-semibold mb-2">Upcoming Tournaments</div>
      <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-muted/40 p-2 rounded">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
};

export default UpcomingTournaments;
