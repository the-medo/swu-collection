import * as React from 'react';
import { SetShare } from '@/hooks/useSetShare/useSetShare.ts';
import SetSharePieChart from '@/components/app/global/SetSharePieCharts/SetSharePieChart.tsx';

interface SetSharePieChartsProps {
  setShare: SetShare;
}

const SetSharePieCharts: React.FC<SetSharePieChartsProps> = ({ setShare }) => {
  return (
    <>
      <SetSharePieChart setShare={setShare} source={'setShare'} />
      <SetSharePieChart setShare={setShare} source={'rotationBlock'} />
    </>
  );
};

export default SetSharePieCharts;
