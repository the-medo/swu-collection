import * as React from 'react';
import MetaPageWeekSelector from './MetaPageWeekSelector';
import { TournamentGroupWithMeta } from '../../../../../../types/TournamentGroup';

interface MetaPageWeekSelectorBySelectedGroupProps {
  tournamentGroup: TournamentGroupWithMeta | undefined;
}

const MetaPageWeekSelectorBySelectedGroup: React.FC<MetaPageWeekSelectorBySelectedGroupProps> = ({ tournamentGroup }) => {
  if (!tournamentGroup || !tournamentGroup.group?.name?.startsWith('PQ Week')) {
    return null;
  }

  const metaId = tournamentGroup.meta?.id as number | undefined;
  const selectedTournamentGroupId = tournamentGroup.group?.id as string | undefined;

  return (
    <MetaPageWeekSelector metaId={metaId} selectedTournamentGroupId={selectedTournamentGroupId} />
  );
};

export default MetaPageWeekSelectorBySelectedGroup;
