import * as React from 'react';

interface WeekToWeekSideStatsProps {
  // Props will be added in the future as needed
}

const WeekToWeekSideStats: React.FC<WeekToWeekSideStatsProps> = () => {
  return (
    <div className="flex flex-col gap-4 lg:col-span-4 xl:col-span-3 border rounded-md pb-4 mb-4">
      <div className="flex items-center justify-center p-12">
        <h2 className="text-2xl font-bold text-muted-foreground">TBD</h2>
      </div>
    </div>
  );
};

export default WeekToWeekSideStats;