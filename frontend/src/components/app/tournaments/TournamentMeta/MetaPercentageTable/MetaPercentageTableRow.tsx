import * as React from 'react';

interface MetaPercentageTableRowProps {
  title: string;
  count: number;
  percentage: string;
  conversion: string | number;
}

export const MetaPercentageTableRow: React.FC<MetaPercentageTableRowProps> = ({
  title,
  count,
  percentage,
  conversion,
}) => {
  return (
    <tr>
      <th className="text-left px-2 bg-accent">{title}</th>
      <td className="text-right">{count}</td>
      <td className="i text-xs text-right">{percentage}%</td>
      <td className="i text-xs text-right">{conversion === '-' ? conversion : `${conversion}%`}</td>
    </tr>
  );
};

export default MetaPercentageTableRow;
