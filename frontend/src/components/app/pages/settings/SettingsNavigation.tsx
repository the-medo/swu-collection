import { Link, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { settingsItems, settingsPageIds, type SettingsPageId } from './settingsNavigation.ts';

export function SettingsNavigation({ page }: { page: SettingsPageId }) {
  const navigate = useNavigate({ from: '/settings' });
  return (
    <>
      <div className="lg:hidden">
        <Select
          value={page}
          onValueChange={value => {
            const selected = settingsPageIds.find(id => id === value);
            if (selected) void navigate({ search: previous => ({ ...previous, page: selected }) });
          }}
        >
          <SelectTrigger aria-label="Settings section" className="bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settingsItems.map(item => (
              <SelectItem key={item.id} value={item.id}>
                <span className="flex items-center gap-2">
                  <item.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {item.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav
        aria-label="User settings"
        className="hidden lg:block lg:sticky lg:top-2 max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-lg border bg-card p-2"
      >
        <ul className="space-y-0.5">
          {settingsItems.map(item => (
            <li key={item.id}>
              <Link
                to="/settings"
                search={previous => ({ ...previous, page: item.id })}
                aria-current={page === item.id ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  page === item.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
