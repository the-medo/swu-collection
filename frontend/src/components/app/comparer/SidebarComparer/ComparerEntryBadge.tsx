import { ComparerEntry } from '@/components/app/comparer/useComparerStore.ts';
import {
  Book,
  BookOpenCheck,
  ExternalLink,
  NotebookTabs,
  ScrollText,
  Star,
  Trash2,
} from 'lucide-react';
import { CollectionType } from '../../../../../../types/enums.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Link } from '@tanstack/react-router';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/components/ui/button.tsx';

interface ComparerEntryBadgeProps {
  entry: ComparerEntry;
  isMain: boolean;
  onRemove: () => void;
  onSetMain: () => void;
}

const ComparerEntryBadge: React.FC<ComparerEntryBadgeProps> = ({
  entry,
  isMain,
  onRemove,
  onSetMain,
}) => {
  const getIcon = () => {
    if (entry.dataType === 'deck') {
      return <Book size={16} />;
    }

    switch (entry.collectionType) {
      case CollectionType.COLLECTION:
        return <BookOpenCheck size={16} />;
      case CollectionType.WANTLIST:
        return <ScrollText size={16} />;
      case CollectionType.OTHER:
        return <NotebookTabs size={16} />;
    }
  };

  const getDetailPath = () => {
    if (entry.dataType === 'deck') {
      return `/decks/${entry.id}`;
    } else {
      return `/collections/${entry.id}`;
    }
  };

  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-md transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isMain
                  ? 'text-foreground/70 dark:text-primary ring-1 ring-foreground/70 dark:ring-primary'
                  : 'text-muted-foreground',
              )}
            >
              {getIcon()}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          {entry.additionalData?.title}
          {isMain && ' (main)'}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end">
        {!isMain && (
          <DropdownMenuItem onClick={onSetMain}>
            <Star className="mr-2 h-4 w-4" />
            <span>Set as main</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link to={getDetailPath()}>
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>Open detail</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Remove</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ComparerEntryBadge;
