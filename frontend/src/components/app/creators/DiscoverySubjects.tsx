import { useState } from 'react';
import { Input } from '@/components/ui/input.tsx';
import { CreatorSetLogo } from './CreatorSetLogo.tsx';
import { hubApi, creatorKeys, useHubQuery } from '@/api/creators';
import type { DiscoveryQuery, DiscoveryResult } from '../../../../../shared/creators/contracts.ts';
import { ContentLeaderPicker } from './ContentLeaderPicker.tsx';
import { selectClass, Status } from './CreatorControls.tsx';

const subjectTypes = ['set', 'tournament', 'leader'] as const;
export function DiscoverySubjects({
  search,
  onChange,
  subject,
}: {
  search: DiscoveryQuery;
  subject?: DiscoveryResult['subject'];
  onChange: (patch: Partial<DiscoveryQuery>) => void;
}) {
  const [q, setQ] = useState('');
  const type = subjectTypes.find(type => type === search.entityType) ?? 'set';
  const result = useHubQuery(
    creatorKeys.subjects(type, q, 'discovery'),
    () => hubApi.subjects(type, q),
    type !== 'leader',
  );
  return (
    <details className="rounded-xl border border-border bg-card p-3" open>
      <summary className="cursor-pointer text-[12px] font-semibold">Specific subject</summary>
      <div className="mt-3 space-y-3">
        {search.entityType && search.entityId && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--creator-soft)] p-2 text-xs">
            <span className="min-w-0 flex-1 break-words">
              {subject?.id === search.entityId && subject.type === search.entityType
                ? subject.label
                : `${search.entityType}: ${search.entityId}`}
            </span>
            <button
              type="button"
              aria-label="Clear subject"
              className="rounded p-1 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onChange({ entityType: type, entityId: undefined })}
            >
              ×
            </button>
          </div>
        )}
        <select
          className={selectClass}
          aria-label="Subject type"
          value={type}
          onChange={e => {
            setQ('');
            onChange({ entityType: e.target.value as typeof type, entityId: undefined });
          }}
        >
          {subjectTypes.map(type => (
            <option key={type} value={type}>
              {type[0].toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
        {type === 'leader' ? (
          <ContentLeaderPicker
            value={search.entityType === 'leader' ? search.entityId : undefined}
            onChange={id => onChange({ entityType: 'leader', entityId: id })}
          />
        ) : (
          <>
            <Input
              aria-label="Search subjects"
              placeholder={type === 'set' ? 'Find a set…' : 'Find a tournament…'}
              value={q}
              maxLength={100}
              onChange={e => setQ(e.target.value)}
            />
            {type === 'tournament' && (
              <p className="m-0! text-[11px]! text-muted-foreground">
                Last month and upcoming majors.
              </p>
            )}
            <Status error={result.error} loading={result.isPending} />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {result.data?.map(subject => {
                const selected = search.entityType === type && search.entityId === subject.id;
                return (
                  <button
                    type="button"
                    key={subject.id}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selected ? 'border-[var(--creator-border)] bg-[var(--creator-soft)]' : 'border-transparent hover:bg-muted'}`}
                    onClick={() =>
                      onChange({ entityType: type, entityId: selected ? undefined : subject.id })
                    }
                  >
                    {type === 'set' && <CreatorSetLogo code={subject.id} />}
                    <span className="min-w-0">
                      {subject.label}
                      {subject.date && (
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {subject.date}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {result.data?.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No matching {type === 'set' ? 'sets' : 'tournaments'}.
              </p>
            )}
          </>
        )}
      </div>
    </details>
  );
}
