import * as React from 'react';

export const ArrowCell: React.FC<{ p1: number | null; p2: number | null }> = ({ p1, p2 }) => {
  if (typeof p1 !== 'number' || typeof p2 !== 'number') return null;
  if (p2 < p1) {
    return (
      <span className="text-emerald-500" title="Improved placement">
        ▲
      </span>
    );
  }
  if (p2 > p1) {
    return (
      <span className="text-red-500" title="Worse placement">
        ▼
      </span>
    );
  }
  return null;
};
