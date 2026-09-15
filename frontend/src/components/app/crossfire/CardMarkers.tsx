import { StickyNote, TriangleAlert } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';

export function CardMarkers({
  notes = [],
  warnings = [],
  onOpenChange,
}: {
  notes?: string[];
  warnings?: string[];
  onOpenChange?: (open: boolean) => void;
}) {
  if (!notes.length && !warnings.length) return null;
  return (
    <span className="cf-card-markers">
      <TooltipProvider delayDuration={150}>
        {notes.length > 0 && (
          <Tooltip onOpenChange={onOpenChange}>
            <TooltipTrigger asChild>
              <span className="cf-note-marker" aria-label={`Named: ${notes.join(', ')}`}>
                <StickyNote size={16} />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              {notes.map(name => (
                <p key={name}>Named: {name}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
        {warnings.length > 0 && (
          <Tooltip onOpenChange={onOpenChange}>
            <TooltipTrigger asChild>
              <span className="cf-warning-marker" aria-label={warnings.join(' ')}>
                <TriangleAlert size={16} />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              {warnings.map(text => (
                <p key={text}>{text}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </span>
  );
}
