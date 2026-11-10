import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';

export default function CollectionInputImport({
  collectionId,
}: {
  collectionId: string | undefined;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Import a SWUDB CSV and review any duplicate or unmatched rows on a saved report.
      </p>
      <Button asChild disabled={!collectionId}>
        <Link to="/collections/import" search={{ collectionId }}>
          Import from SWUDB
        </Link>
      </Button>
    </div>
  );
}
