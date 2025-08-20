import * as React from 'react';

export interface WeeklyChangeProps {
  payload: any;
}

const WeeklyChange: React.FC<WeeklyChangeProps> = ({ payload }) => {
  return (
    <div className="h-full w-full">
      <div className="text-sm font-semibold mb-2">Weekly Change</div>
      <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-muted/40 p-2 rounded">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
};

export default WeeklyChange;
