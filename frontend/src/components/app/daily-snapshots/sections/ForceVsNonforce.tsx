import * as React from 'react';

export interface ForceVsNonforceProps {
  payload: any;
}

const ForceVsNonforce: React.FC<ForceVsNonforceProps> = ({ payload }) => {
  return (
    <div className="h-full w-full">
      <div className="text-sm font-semibold mb-2">Force vs Non-Force</div>
      <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-muted/40 p-2 rounded">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
};

export default ForceVsNonforce;
