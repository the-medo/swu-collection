import { X } from 'lucide-react';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Field, selectClass, TagPicker } from './CreatorControls.tsx';
import { LanguageFilter } from './CreatorLanguages.tsx';
import { DiscoverySubjects } from './DiscoverySubjects.tsx';
import { normalizeTagIds } from '../../../../../shared/creators/taxonomy.ts';
import type { getDiscoveryFilters } from './discoveryFilterState.ts';
import type { DiscoveryQuery, DiscoveryResult } from '../../../../../shared/creators/contracts.ts';

export function DiscoveryFilters({
  search,
  data,
  onChange,
}: {
  search: DiscoveryQuery;
  data?: DiscoveryResult;
  onChange: (patch: Partial<DiscoveryQuery>) => void;
}) {
  const selected = normalizeTagIds(search.tags?.split(',').filter(Boolean) ?? []);
  return (
    <div className="space-y-4">
      <LanguageFilter
        available={data?.languages ?? []}
        value={search.language}
        onChange={language => onChange({ language })}
      />
      <TagPicker
        selected={selected}
        onChange={ids => onChange({ tags: ids.join(',') || undefined })}
        compact
      />
      <DiscoverySubjects
        key={search.entityType ?? 'set'}
        search={search}
        onChange={onChange}
        subject={data?.subject}
      />
      <Field label="Relevance over time">
        <select
          className={selectClass}
          value={search.freshness ?? ''}
          onChange={event =>
            onChange({
              freshness: (event.target.value as DiscoveryQuery['freshness']) || undefined,
            })
          }
        >
          <option value="">Current and historical</option>
          <option value="current">Current</option>
          <option value="historical">Historical</option>
        </select>
      </Field>
      <Field label="Published since">
        <Input
          type="date"
          value={search.after ?? ''}
          onChange={event => onChange({ after: event.target.value || undefined })}
        />
      </Field>
      <Field label="Published through">
        <Input
          type="date"
          value={search.before ?? ''}
          onChange={event => onChange({ before: event.target.value || undefined })}
        />
      </Field>
    </div>
  );
}

export function DiscoveryFilterChips({
  filters,
  onChange,
  onClear,
}: {
  filters: ReturnType<typeof getDiscoveryFilters>;
  onChange: (patch: Partial<DiscoveryQuery>) => void;
  onClear: () => void;
}) {
  if (!filters.length) return null;
  return (
    <div role="group" aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {filters.map(filter => (
        <Button
          key={filter.id}
          variant="outline"
          size="sm"
          className="h-auto min-h-8 max-w-full gap-1.5 rounded-full py-1 text-xs"
          aria-label={`Remove ${filter.label} filter`}
          onClick={() => onChange(filter.remove)}
        >
          <span className="min-w-0 truncate">{filter.label}</span>
          <X size={12} className="shrink-0" aria-hidden="true" />
        </Button>
      ))}
      <Button size="sm" variant="ghost" className="text-xs" onClick={onClear}>
        Clear all filters
      </Button>
    </div>
  );
}
