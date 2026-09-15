import { Link, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminPageIds, adminSections, type AdminPageId } from './adminNavigation';

export function AdminNavigation({ page }: { page: AdminPageId }) {
  const navigate = useNavigate({ from: '/admin' });
  return (
    <>
      <div className="lg:hidden">
        <Select
          value={page}
          onValueChange={value => {
            const selected = adminPageIds.find(id => id === value);
            if (selected) void navigate({ search: previous => ({ ...previous, page: selected }) });
          }}
        >
          <SelectTrigger aria-label="Administration section" className="bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {adminSections.map(section => (
              <SelectGroup key={section.title}>
                <SelectLabel>{section.title}</SelectLabel>
                {section.items.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    <span className="flex items-center gap-2">
                      <item.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                      {item.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav
        aria-label="Administration"
        className="hidden lg:block lg:sticky lg:top-2 max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-lg border bg-card p-2"
      >
        {adminSections.map(section => (
          <div key={section.title} className="mb-3 last:mb-0">
            <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(item => (
                <li key={item.id}>
                  <Link
                    to="/admin"
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
          </div>
        ))}
      </nav>
    </>
  );
}
