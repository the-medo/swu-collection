import React from 'react';
import GridSection from '@/components/app/global/GridSection/GridSection.tsx';
import GridSectionContent from '@/components/app/global/GridSection/GridSectionContent.tsx';
import SectionHeader from '@/components/app/daily-snapshots/sections/components/SectionHeader.tsx';

const gridSizing = {
  4: { row: { from: 2, to: 3 }, col: { from: 2, to: 4 } },
  3: { row: { from: 2, to: 3 }, col: { from: 2, to: 3 } },
  2: { row: { from: 2, to: 3 }, col: { from: 2, to: 2 } },
  1: { row: { from: 3, to: 3 }, col: { from: 1, to: 1 } },
};

const PublicPools: React.FC = () => {
  return (
    <GridSection sizing={gridSizing}>
      <GridSectionContent>
        <SectionHeader
          headerAndTooltips={
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h4>All pools</h4>
              </div>
            </>
          }
        />
        Yeah
      </GridSectionContent>
    </GridSection>
  );
};

export default PublicPools;
