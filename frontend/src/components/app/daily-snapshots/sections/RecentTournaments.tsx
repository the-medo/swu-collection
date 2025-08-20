import * as React from 'react';

export interface RecentTournamentsProps {
  payload: any;
}

const RecentTournaments: React.FC<RecentTournamentsProps> = ({ payload }) => {
  return (
    <div className="h-full w-full">
      <div className="text-sm font-semibold mb-2">Recent Tournaments</div>
      <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-muted/40 p-2 rounded">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
};

export default RecentTournaments;
