import React from 'react';
import UpdateDeckInformationAction from '@/components/app/admin/SpecialActionsPage/UpdateDeckInformationAction';
import RunDailySnapshotAction from '@/components/app/admin/SpecialActionsPage/RunDailySnapshotAction';

export const SpecialActionsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <UpdateDeckInformationAction />
      <RunDailySnapshotAction />
    </div>
  );
};

export default SpecialActionsPage;
