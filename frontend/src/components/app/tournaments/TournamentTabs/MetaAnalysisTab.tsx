import * as React from 'react';

interface MetaAnalysisTabProps {
  tournamentId: string;
}

const MetaAnalysisTab: React.FC<MetaAnalysisTabProps> = ({ tournamentId }) => {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-md border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Meta Analysis</h3>
        <div className="bg-muted p-8 rounded-md text-center">
          <p className="text-muted-foreground">
            Tournament meta analysis will be displayed here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MetaAnalysisTab;