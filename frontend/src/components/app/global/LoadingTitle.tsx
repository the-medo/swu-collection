import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton.tsx';

export interface LoadingTitleProps {
  mainTitle?: React.ReactNode;
  subTitle?: React.ReactNode;
  loading?: boolean;
}

const LoadingTitle: React.FC<LoadingTitleProps> = ({ mainTitle, subTitle, loading = false }) => {
  if (loading) {
    return (
      <div className="flex items-end gap-2 lg:min-w-[400px] mt-2">
        <h3>
          <Skeleton className="size-6 lg:w-[200px]" />{' '}
        </h3>
        <h6>
          <Skeleton className="size-4 lg:w-[300px]" />{' '}
        </h6>
      </div>
    );
  }

  return (
    <div className="flex max-lg:flex-col items-end gap-2 lg:min-w-[400px]">
      <h3>{mainTitle}</h3>
      {subTitle && <h6>{subTitle}</h6>}
    </div>
  );
};

export default LoadingTitle;
