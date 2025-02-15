import { Star } from 'lucide-react';

export const foilRenderer = (value: boolean) =>
  value ? (
    <div className="w-4">
      <Star className="w-4 h-4 min-w-4 min-h-4 text-yellow-600" />
    </div>
  ) : null;
