import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { creationTags } from '../../../../../shared/creators/taxonomy.ts';
import { creatorSelectedControl } from './creatorStyles.ts';

export function CreatorTagFilter({
  counts,
  selected,
  onChange,
}: {
  counts: { id: string; count: number }[];
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const countById = new Map(counts.map(tag => [tag.id, tag.count]));
  const used = creationTags.filter(
    tag => tag.dimension !== 'medium' && (countById.has(tag.id) || selected.includes(tag.id)),
  );
  if (!used.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
      {used.map(tag => (
        <Button
          key={tag.id}
          type="button"
          size="sm"
          variant="outline"
          aria-pressed={selected.includes(tag.id)}
          className={cn(
            'h-auto min-h-8 whitespace-normal rounded-full px-3 py-1 text-xs',
            selected.includes(tag.id) && creatorSelectedControl,
          )}
          onClick={() =>
            onChange(
              selected.includes(tag.id)
                ? selected.filter(id => id !== tag.id)
                : [...selected, tag.id],
            )
          }
        >
          {tag.label} ({countById.get(tag.id) ?? 0})
        </Button>
      ))}
    </div>
  );
}
