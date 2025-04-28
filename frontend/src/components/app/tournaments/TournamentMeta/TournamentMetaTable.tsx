import * as React from 'react';

interface AnalysisDataItem {
  key: string;
  count: number;
}

interface TournamentMetaTableProps {
  analysisData: AnalysisDataItem[];
  metaInfo: string;
  totalDecks: number;
}

const TournamentMetaTable: React.FC<TournamentMetaTableProps> = ({
  analysisData,
  metaInfo,
  totalDecks,
}) => {
  if (analysisData.length === 0) {
    return <p className="text-muted-foreground">No data available for the selected filters.</p>;
  }

  return (
    <div className="border border-border rounded-md p-4 mt-4">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b">
              {metaInfo === 'aspects' || metaInfo === 'aspectsDetailed' ? 'Aspect(s)' : 'Deck'}
            </th>
            <th className="text-right p-2 border-b">Count</th>
            <th className="text-right p-2 border-b">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {analysisData.map(({ key, count }) => (
            <tr key={key}>
              <th className="text-left p-2 border-b font-normal">{key || 'Unknown'}</th>
              <td className="text-right p-2 border-b">{count}</td>
              <td className="text-right p-2 border-b">
                {((count / totalDecks) * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TournamentMetaTable;