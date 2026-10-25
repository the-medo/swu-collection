import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Globe, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

export function LimitedHeader({ publicPools = false }: { publicPools?: boolean }) {
  return (
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {publicPools && (
          <Button asChild size="iconMedium" variant="ghost">
            <Link to="/limited" aria-label="Back to sealed deck">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        )}
        <h1 className={limitedStyles.title}>{publicPools ? 'Public card pools' : 'Sealed deck'}</h1>
      </div>
      <Button asChild size="sm" variant="outline">
        {publicPools ? (
          <Link to="/limited">
            <Plus className="size-4" /> Create pool
          </Link>
        ) : (
          <Link to="/limited/public">
            <Globe className="size-4" /> Public pools
          </Link>
        )}
      </Button>
    </header>
  );
}
