import * as React from 'react';

export interface SectionHeaderProps {
  headerAndTooltips: React.ReactNode;
  dropdownMenu?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ headerAndTooltips, dropdownMenu }) => {
  return (
    <div className="flex gap-2 justify-between items-start border-b">
      <div className="flex items-start gap-2">{headerAndTooltips}</div>
      {dropdownMenu ?? null}
    </div>
  );
};

export default SectionHeader;
