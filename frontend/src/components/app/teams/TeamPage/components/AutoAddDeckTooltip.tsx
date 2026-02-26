import * as React from 'react';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';

export const AutoAddDeckTooltip: React.FC = () => {
  return (
    <InfoTooltip
      tooltip={
        <div className="flex flex-col gap-2">
          <div>
            When enabled, all decks played by this member will be automatically added to the team
            and displayed in team statistics.
          </div>

          <div>
            If you turn this off, new decks played by this member will need to be added manually.
          </div>

          <div>
            Recomended setting is ON - you still have the possibility to remove unwanted decks
            later.
          </div>
        </div>
      }
    />
  );
};
