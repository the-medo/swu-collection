import * as React from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

const DeckImageCardVariants: React.FC = () => {
  return (
    <AccordionItem value="card-variants">
      <AccordionTrigger right className="font-semibold">
        Deck image card variants
      </AccordionTrigger>
      <AccordionContent>
        <div className="text-sm text-muted-foreground">
          Card variants configuration mockup (coming soon)
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default DeckImageCardVariants;
