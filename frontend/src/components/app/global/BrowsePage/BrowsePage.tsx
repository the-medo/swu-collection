import { browseStyles } from '@/components/app/global/BrowsePage/browseStyles';
import type { ComponentType, ReactNode } from 'react';
import { Link, type LinkProps, type RegisteredRouter } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';

export function BrowsePage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(browseStyles.page, className)}>{children}</div>;
}

export function BrowseHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  hero = false,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  icon: ComponentType<{ className?: string }>;
  children?: ReactNode;
  hero?: boolean;
}) {
  return (
    <header className={cn(browseStyles.header, hero && browseStyles.headerHero)}>
      <div className={browseStyles.headerCopy}>
        <div className={browseStyles.eyebrow}>
          <Icon className="size-4" />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <div className={browseStyles.description}>{description}</div>
      </div>
      {children && <div className={browseStyles.headerActions}>{children}</div>}
    </header>
  );
}

export function BrowseTabs({
  label,
  items,
}: {
  label: string;
  items: {
    title: string;
    to: string;
    search?: LinkProps<'a', RegisteredRouter, string, string>['search'];
    active: boolean;
    icon: ComponentType<{ className?: string }>;
  }[];
}) {
  return (
    <nav className={browseStyles.tabs} aria-label={label}>
      {items.map(({ title, to, search, active, icon: Icon }) => (
        <Link<RegisteredRouter, string, string>
          key={`${to}:${title}`}
          to={to}
          search={search}
          activeOptions={{ exact: true }}
          aria-current={active ? 'page' : undefined}
        >
          <Icon className="size-4 shrink-0" />
          {title}
        </Link>
      ))}
    </nav>
  );
}

export function BrowseEmpty({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={browseStyles.empty}>
      <span className={browseStyles.icon}>
        <Icon className="size-6" />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
