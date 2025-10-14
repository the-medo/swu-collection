import React from 'react';
import { Button } from '@/components/ui/button';
import { VariantCheckerTable } from './VariantCheckerTable';

interface VariantCheckerPageProps {}

const VariantCheckerPage: React.FC<VariantCheckerPageProps> = () => {
  const [showTable, setShowTable] = React.useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Variant Checker</h2>
      <p className="text-sm text-muted-foreground">
        Use this tool to find card variants that appear in user collections or price data but are missing from the current card list.
      </p>
      <div className="flex items-center gap-2">
        <Button onClick={() => setShowTable(true)}>Check variants</Button>
      </div>
      {showTable ? (
        <div className="rounded-md border">
          <VariantCheckerTable />
        </div>
      ) : (
        <ul className="list-disc pl-6 text-sm">
          <li>This will check combinations of card_id and variant_id against the current card list.</li>
        </ul>
      )}
    </div>
  );
};

export default VariantCheckerPage;