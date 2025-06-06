import * as React from 'react';
import { Scale, Layers, Star } from 'lucide-react';

const ComparerInstructions: React.FC = () => {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <Scale className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Comparer - Quick Guide</h3>
      </div>

      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <Layers size={18} className="text-primary" />
        </div>
        <div>
          <p className="font-medium">Add entires</p>
          <p className="text-muted-foreground">
            Add collections, decks, wantlists or card lists to compare by clicking the "Add to comparer"
            button on their detail page.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <Star size={18} className="text-primary" />
        </div>
        <div>
          <p className="font-medium">Choose Main entry</p>
          <p className="text-muted-foreground">
            All other entries will be compared against this one.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <Scale size={18} className="text-primary" />
        </div>
        <div>
          <p className="font-medium">View Matching Cards</p>
          <p className="text-muted-foreground">
            See which cards appear in both collections and their quantities. This is helpful for
            finding duplicates or completing sets.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        Tip: This tool is great for finding cards to trade with other collectors or identifying
        potential upgrades for your collection.
      </p>
    </div>
  );
};

export default ComparerInstructions;
