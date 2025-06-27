import * as React from 'react';
import { useSearch } from '@tanstack/react-router';

interface SideStatsNoDataMessageProps {
  customMessage?: string;
}

const SideStatsNoDataMessage: React.FC<SideStatsNoDataMessageProps> = ({ customMessage }) => {
  const { pqWtwViewMode = 'chart' } = useSearch({ strict: false });

  let message = '';

  if (customMessage) {
    message = customMessage;
  } else if (pqWtwViewMode === 'table') {
    message = 'Hover or click on a table to display data here.';
  } else {
    message = 'Click on a chart dataset to display data here.';
  }

  return <p className="text-muted-foreground text-center">{message}</p>;
};

export default SideStatsNoDataMessage;
